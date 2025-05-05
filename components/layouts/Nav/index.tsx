"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import icons from "@/icons";
import { useRouter } from "next/router";

interface IProps {
  isAuthenticated: boolean;
  authenticatedUser: any;
}

const Nav: React.FC<IProps> = ({ isAuthenticated, authenticatedUser }) => {
  const pathname = usePathname();
  const [isMobileNavOpen, setMobileNavOpen] = useState(false);
  const router = useRouter();
  const toggleMobileNav = () => {
    setMobileNavOpen(!isMobileNavOpen);
  };

// // before
// const parsedUser = authenticatedUser.length
//   ? JSON.parse(authenticatedUser)
//   : "";

// after
const parsedUser = authenticatedUser || "";


  return (
    <nav className="bg-white w-full fixed top-0 left-0 !z-[9999] font-lexen">
      <div className="max-container">
        <div className="py-5 flex items-end justify-between">
          <Link href="/">
            <img
              className="w-[219px] h-[70px] "
              src="/png/LOGO.png"
              alt="BSI Logo"
              draggable={false}
            />
          </Link>

          {/* Mobile Navigation Toggle Button */}
          <button
            onClick={toggleMobileNav}
            className="lg:hidden text-black-600 focus:outline-none"
          >
            {icons.BurgerIcon()}
          </button>
          {/* Desktop Navigation */}
          <div className="hidden  lg:flex items-center xl:space-x-8 space-x-3 font-inter uppercase  font-semibold text-xs">
            {isAuthenticated ? (
              <div className="flex space-x-2">
                <div className="relative w-7 h-7">
                  <Image
                    src={parsedUser?.profile?.profilePhoto?.url}
                    alt="user"
                    fill
                    className="rounded-full"
                  />
                </div>
              </div>
            ) : (
              <div
                className={`flex items-center gap-x-3 text-black-600  hover:text-gray-600 cursor-pointer`}
                onClick={() =>
                  router.replace("https://www.blacksustainability.org/")
                }
              >
                <span>{icons.DashboardProfile()}</span>
                <span>Login</span>
              </div>
            )}
            <div className="relative">
              <a
                href="https://www.blacksustainability.org/"
                target="_blank"
                className="p-[13px] bg-[#FFBF23] rounded-md capitalize font-semibold"
              >
                Return to Home Page
              </a>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isMobileNavOpen && (
            <div className="lg:hidden absolute -top-0 left-0 w-full h-[100vh] bg-slate-100">
              <div className="py-5 md:px-20 px-5 flex flex-col gap-y-5 font-inter text-sm">
                <div className="flex justify-between items-center">
                  <Link href="/">
                    <img
                      className="w-[219px] h-[70px] "
                      src="/png/LOGO.png"
                      alt="BSI Logo"
                      draggable={false}
                    />
                  </Link>
                  <div className="lg:hidden">
                    <button
                      onClick={toggleMobileNav}
                      className="text-black-600 focus:outline-none"
                    >
                      {icons.BurgerIcon()}
                    </button>
                  </div>
                </div>

                <div className="flex  flex-col items-start space-y-8 font-inter uppercase  font-semibold text-xs">
                  {isAuthenticated ? (
                    <div className="flex space-x-2">
                      <icons.userProfile />
                      <div className="relative w-4 h-4">
                        <Image
                          src={parsedUser?.profile?.profilePhoto?.url}
                          alt="user"
                          fill
                          className="rounded-full"
                        />
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => {
                        setMobileNavOpen(!isMobileNavOpen);
                        router.replace("https://www.blacksustainability.org/");
                      }}
                      className={`flex items-center gap-x-3 py-1.5 text-black-600  hover:text-gray-600`}
                    >
                      <icons.userProfile />
                      Login
                    </div>
                  )}
                  <div
                    onClick={() => {
                      setMobileNavOpen(!isMobileNavOpen);
                      router.replace("https://www.blacksustainability.org/");
                    }}
                    className="relative"
                  >
                    <span className="p-[13px] bg-[#FFBF23] rounded-md capitalize font-semibold">
                      Return to Home Page
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Nav;
