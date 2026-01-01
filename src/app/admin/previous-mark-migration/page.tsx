"use client"
import React, { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { collection, getDocs, query, where, addDoc, writeBatch, doc, getDoc, orderBy, limit, deleteDoc, onSnapshot } from 'firebase/firestore'
import { db } from '../../../config/firebaseConfig'
import toast from 'react-hot-toast'

interface MarkRecord {
  regNumber: string;
  subjectCode: string;
  marks: number;
  semester: string;
  status?: 'Valid' | 'Invalid';
  error?: string;
}

interface MigrationLog {
  id: string;
  action: string;
  timestamp: any;
  status: 'Success' | 'Error' | 'Rollback';
  details: string;
  importId?: string;
}

export default function PreviousMarkMigrationPage() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<MarkRecord[]>([])
  const [logs, setLogs] = useState<MigrationLog[]>([])
  
  const [isValidating, setIsValidating] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  
  const [importId, setImportId] = useState<string>('') 

  // Load logs
  useEffect(() => {
    const q = query(collection(db, "migration_logs"), orderBy("timestamp", "desc"), limit(20))
    const unsub = onSnapshot(q, (snap) => {
        setLogs(snap.docs.map(d => ({id: d.id, ...d.data()} as MigrationLog)))
    })
    return () => unsub()
  }, [])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if(!file) return;
    
    setUploadedFile(file)
    const reader = new FileReader()
    reader.onload = (evt) => {
        try {
            const bstr = evt.target?.result
            const wb = XLSX.read(bstr, { type: 'binary' })
            const wsname = wb.SheetNames[0]
            const ws = wb.Sheets[wsname]
            const data: any[] = XLSX.utils.sheet_to_json(ws)
            
            // Map to internal format
            const records: MarkRecord[] = data.map(row => ({
                regNumber: row['RegNumber'] || row['regNumber'] || '',
                subjectCode: row['SubjectCode'] || row['subjectCode'] || '',
                marks: row['Marks'] || row['marks'] || 0,
                semester: row['Semester'] || row['semester'] || '',
                status: 'Valid' // Default, will be checked
            }))
            
            setParsedData(records)
            setImportId(Math.random().toString(36).substr(2, 9))
            toast.success(`Parsed ${records.length} rows`)
        } catch (error) {
            console.error(error)
            toast.error("Failed to parse file")
        }
    }
    reader.readAsBinaryString(file)
  }

  const validateData = async () => {
      setIsValidating(true)
      try {
          // fetch all valid reg numbers and subject codes for cache (optimization)
          const [studentsSnap, subjectsSnap] = await Promise.all([
              getDocs(collection(db, "students")),
              getDocs(collection(db, "subjects"))
          ])
          
          const validRegNos = new Set(studentsSnap.docs.map(d => d.data().registerNumber))
          const validSubCodes = new Set(subjectsSnap.docs.map(d => d.data().code)) 
          
          const validated = parsedData.map(record => {
              let error = ''
              if (!validRegNos.has(record.regNumber)) error += `Student ${record.regNumber} not found. `
              if (!validSubCodes.has(record.subjectCode)) error += `Subject ${record.subjectCode} not found. `
              if (record.marks < 0 || record.marks > 100) error += `Marks invalid. `
              
              return {
                  ...record,
                  status: error ? 'Invalid' : 'Valid',
                  error: error.trim()
              } as MarkRecord
          })
          
          setParsedData(validated)
          
          const invalidCount = validated.filter(r => r.status === 'Invalid').length
          if(invalidCount > 0) {
              toast.error(`Found ${invalidCount} invalid records`)
          } else {
              toast.success("All records validated successfully")
          }

      } catch (error) {
          console.error(error)
          toast.error("Validation failed")
      } finally {
          setIsValidating(false)
      }
  }

  const processImport = async () => {
      if(parsedData.some(r => r.status === 'Invalid')) {
          if(!confirm("There are invalid records. Import only VALID records?")) return;
      }
      
      setIsImporting(true)
      const validRecords = parsedData.filter(r => r.status === 'Valid')
      
      if(validRecords.length === 0) {
          toast.error("No valid records to import")
          setIsImporting(false)
          return
      }

      try {
          const batchSize = 450 // Firestore batch limit is 500
          const chunks = []
          for (let i = 0; i < validRecords.length; i += batchSize) {
              chunks.push(validRecords.slice(i, i + batchSize));
          }

          let processed = 0
          
          for (const chunk of chunks) {
              const batch = writeBatch(db)
              chunk.forEach(rec => {
                  const ref = doc(collection(db, "previous_marks"))
                  batch.set(ref, {
                      ...rec,
                      importId: importId,
                      createdAt: new Date().toISOString()
                  })
              })
              await batch.commit()
              processed += chunk.length
          }

          // Log
          await addDoc(collection(db, "migration_logs"), {
              action: 'Import',
              timestamp: new Date().toISOString(),
              status: 'Success',
              details: `Imported ${processed} records.`,
              importId: importId
          })

          toast.success("Import completed successfully")
          setParsedData([])
          setUploadedFile(null)

      } catch (error) {
          console.error(error)
          toast.error("Import failed")
          await addDoc(collection(db, "migration_logs"), {
              action: 'Import',
              timestamp: new Date().toISOString(),
              status: 'Error',
              details: `Import failed: ${error}`,
              importId: importId
          })
      } finally {
          setIsImporting(false)
      }
  }

  const handleRollback = async (targetImportId: string) => {
      if(!confirm("Rollback this import? This will delete all records associated with it.")) return;
      
      try {
          const q = query(collection(db, "previous_marks"), where("importId", "==", targetImportId))
          const snap = await getDocs(q)
          
          const batchSize = 450
          const batches = []
          let batch = writeBatch(db)
          let count = 0
          
          snap.docs.forEach((doc, idx) => {
              batch.delete(doc.ref)
              count++
              if (count % batchSize === 0) {
                  batches.push(batch)
                  batch = writeBatch(db)
              }
          })
          if (count % batchSize !== 0) batches.push(batch)

          await Promise.all(batches.map(b => b.commit()))
          
          // Log rollback
          await addDoc(collection(db, "migration_logs"), {
              action: 'Rollback',
              timestamp: new Date().toISOString(),
              status: 'Rollback',
              details: `Rolled back ${snap.size} records.`,
              importId: targetImportId
          })

          toast.success(`Rollback successful. Deleted ${snap.size} records.`)

      } catch (error) {
          console.error(error)
          toast.error("Rollback failed")
      }
  }

  return (
    <div className="mt-[100px] p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Previous Mark Migration</h1>
          <p className="text-gray-600 mt-2">Bulk import historical marks via Excel/CSV.</p>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow-md mb-8 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload File</h2>
          <div className="flex items-center space-x-4">
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
          <p className="text-xs text-gray-400 mt-2">Required Columns: RegNumber, SubjectCode, Marks, Semester</p>
        </div>

        {/* Data Preview & Validation */}
        {parsedData.length > 0 && (
          <div className="bg-white rounded-lg shadow-md mb-8 overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Preview ({parsedData.length} records)</h2>
              <div className="space-x-3">
                  <button 
                    onClick={validateData}
                    disabled={isValidating}
                    className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                  >
                        {isValidating ? 'Validating...' : 'Validate Data'}
                  </button>
                  <button 
                    onClick={processImport}
                    disabled={isImporting || isValidating}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                      {isImporting ? 'Importing...' : 'Start Import'}
                  </button>
              </div>
            </div>
            <div className="overflow-x-auto max-h-[500px]">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reg Number</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Marks</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Error</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {parsedData.map((record, index) => (
                    <tr key={index} className={record.status === 'Invalid' ? 'bg-red-50' : 'hover:bg-gray-50'}>
                      <td className="px-6 py-4 text-sm text-gray-900">{record.regNumber}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{record.subjectCode}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{record.marks}</td>
                      <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs ${record.status === 'Valid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {record.status}
                          </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-red-500">{record.error}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Logs */}
        <div className="bg-white rounded-lg shadow-md mb-8 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Migration Logs</h2>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rollback</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
               {logs.map((log) => (
                   <tr key={log.id}>
                        <td className="px-6 py-4 text-sm text-gray-500">{new Date(log.timestamp).toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm font-medium">{log.action}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{log.details}</td>
                        <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded text-xs ${
                                log.status === 'Success' ? 'bg-green-100 text-green-800' :
                                log.status === 'Error' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                                {log.status}
                            </span>
                        </td>
                        <td className="px-6 py-4">
                            {log.action === 'Import' && log.status === 'Success' && (
                                <button 
                                    onClick={() => handleRollback(log.importId!)}
                                    className="text-red-600 hover:text-red-900 text-xs font-bold"
                                >
                                    Rollback
                                </button>
                            )}
                        </td>
                   </tr>
               ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  )
}