import React from "react";

export default function FeesPage() {
  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen mt-[80px]">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">My Fees</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700">
          Make Payment
        </button>
      </div>

      {/* Top Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="text-gray-600 text-sm">Total Outstanding</h2>
          <p className="text-3xl font-bold">$17,800.00</p>
          <button className="mt-3 text-blue-600 font-medium">View All Details</button>
        </div>

        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="text-gray-600 text-sm">Upcoming Due Date</h2>
          <p className="text-xl font-semibold mt-2">August 15, 2024</p>
          <p className="text-sm text-gray-500">Plan your payments to avoid late fees.</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="text-gray-600 text-sm">Payment Options</h2>
          <p className="text-sm mt-2 text-gray-500">
            Secure online payment gateway. Direct bank transfer (details on request).
          </p>
          <button className="mt-3 text-blue-600 font-medium">Learn More</button>
        </div>
      </div>

      {/* Fee Breakdown */}
      <div className="bg-white p-6 rounded-xl shadow">
        <h2 className="text-lg font-semibold mb-4">Fee Breakdown</h2>
        <table className="w-full text-left border-t">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3">Fee ID</th>
              <th className="p-3">Item</th>
              <th className="p-3">Due Date</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {[
              { id: "F001", item: "Tuition Fee - Semester 1", date: "8/15/2024", amt: "$15,000.00", status: "Outstanding" },
              { id: "F002", item: "Lab Fee - Semester 1", date: "8/15/2024", amt: "$1,500.00", status: "Outstanding" },
              { id: "F003", item: "Library Fee - Annual", date: "8/1/2024", amt: "$500.00", status: "Outstanding" },
              { id: "F004", item: "Exam Fee - Semester 1", date: "11/1/2024", amt: "$800.00", status: "Outstanding" },
              { id: "F005", item: "Accommodation Fee - Q1", date: "7/1/2024", amt: "$3,000.00", status: "Paid" },
            ].map((fee) => (
              <tr key={fee.id} className="border-t">
                <td className="p-3">{fee.id}</td>
                <td className="p-3">{fee.item}</td>
                <td className="p-3">{fee.date}</td>
                <td className="p-3">{fee.amt}</td>
                <td className="p-3">
                  <span
                    className={`px-2 py-1 rounded-lg text-xs font-medium ${
                      fee.status === "Paid"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {fee.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Payment History */}
      <div className="bg-white p-6 rounded-xl shadow">
        <h2 className="text-lg font-semibold mb-4">Payment History</h2>
        <table className="w-full text-left border-t">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3">Payment ID</th>
              <th className="p-3">Date</th>
              <th className="p-3">Description</th>
              <th className="p-3">Amount Paid</th>
              <th className="p-3">Method</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {[
              { id: "P001", date: "6/28/2024", desc: "Accommodation Fee - Q1", amt: "$3,000.00", method: "Online Payment", status: "Success" },
              { id: "P002", date: "5/10/2024", desc: "Admission Fee", amt: "$5,000.00", method: "Bank Transfer", status: "Success" },
              { id: "P003", date: "4/1/2024", desc: "Application Fee", amt: "$100.00", method: "Credit Card", status: "Success" },
            ].map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-3">{p.id}</td>
                <td className="p-3">{p.date}</td>
                <td className="p-3">{p.desc}</td>
                <td className="p-3">{p.amt}</td>
                <td className="p-3">{p.method}</td>
                <td className="p-3">
                  <span className="px-2 py-1 rounded-lg text-xs font-medium bg-green-100 text-green-700">
                    {p.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-sm text-gray-500 mt-3">Payments typically process within 1-3 business days.</p>
      </div>
    </div>
  );
}
