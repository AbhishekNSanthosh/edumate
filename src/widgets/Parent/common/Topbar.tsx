import Image from "next/image";
import React from "react";
import { IoIosNotificationsOutline } from "react-icons/io";

export default function Topbar() {
  return (
    <div className="h-[11vh] fixed bg-white w-[82vw] flex flex-row items-center justify-between px-[2vw] shadow-sm">
      <div className="">
        <span className="font-semibold text-xl text-primary">Welcome, Abhishek’s Parent! 👋</span>
      </div>
      <div className="flex flex-row gap-5 items-center">
        <div className="">
            <IoIosNotificationsOutline className="text-[30px] text-primary"/>
        </div>
        <div className="rounded-full p-1 border-2 border-primary">
          <Image
            src={"/assets/profile.png"}
            alt=""
            width={1000}
            height={1000}
            className="w-[2.5rem] h-[2.5rem]"
          />
        </div>
      </div>
    </div>
  );
}
