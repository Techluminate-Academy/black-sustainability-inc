"use client"

import Image from "next/image";
import Link from "next/link";
import React, { useState } from "react";
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
  const toggleMobileNav = () => setMobileNavOpen(!isMobileNavOpen);
  const parsedUser = authenticatedUser || "";

  return (
    <nav className="bg-white w-full fixed top-0 left-0 !z-[9999] font-lexen">
      <div className="max-container">
        <div className="py-5 flex items-end justify-between">
          <Link href="/">
            <img
              className="w-[219px] h-[70px]"
              src="/png/LOGO.png"
              alt="BSI Logo"
              draggable={false}
            />
          </Link>

          {/* Mobile Toggle */}
          <button
            onClick={toggleMobileNav}
            className="lg:hidden text-black-600 focus:outline-none"
          >
            {icons.BurgerIcon()}
          </button>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center xl:space-x-8 space-x-3 font-inter uppercase font-semibold text-xs">
            {isAuthenticated ? (
              <>
                <Link href="/update-profile">
                  <button className="py-2 px-4 bg-[#FFBF23] text-black-600 rounded-md font-semibold uppercase text-xs transition hover:bg-yellow-500">
                    Update Profile / Map Listing
                  </button>
                </Link>
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
              </>
            ) : (
              <Link href="https://www.blacksustainability.org/">
                <button className="py-2 px-4 bg-[#FFBF23] text-black-600 rounded-md font-semibold uppercase text-xs transition hover:bg-yellow-500">
                  Login
                </button>
              </Link>
            )}

            <Link
              href="https://www.blacksustainability.org/"
              target="_blank"
              className="p-[13px] bg-[#FFBF23] rounded-md capitalize font-semibold"
            >
              Return to Home Page
            </Link>
          </div>

          {/* Mobile Nav */}
          {isMobileNavOpen && (
            <div className="lg:hidden absolute top-0 left-0 w-full h-[100vh] bg-slate-100">
              <div className="py-5 md:px-20 px-5 flex flex-col gap-y-5 font-inter text-sm">
                <div className="flex justify-between items-center">
                  <Link href="/">
                    <img
                      className="w-[219px] h-[70px]"
                      src="/png/LOGO.png"
                      alt="BSI Logo"
                      draggable={false}
                    />
                  </Link>
                  <button
                    onClick={toggleMobileNav}
                    className="text-black-600 focus:outline-none"
                  >
                    {icons.BurgerIcon()}
                  </button>
                </div>

                <div className="flex flex-col items-start space-y-8 uppercase font-semibold text-xs">
                  {isAuthenticated ? (
                    <>
                      <Link href="/update-profile">
                        <button className="py-1.5 px-4 bg-[#FFBF23] text-black-600 rounded-md font-semibold uppercase text-xs transition hover:bg-yellow-500">
                          Update Profile / Map Listing
                        </button>
                      </Link>
                      <div className="flex space-x-2">
                        <div className="relative w-4 h-4">
                          <Image
                            src={parsedUser?.profile?.profilePhoto?.url}
                            alt="user"
                            fill
                            className="rounded-full"
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        toggleMobileNav();
                        router.replace("https://www.blacksustainability.org/");
                      }}
                      className="py-1.5 px-4 bg-[#FFBF23] text-black-600 rounded-md font-semibold uppercase text-xs transition hover:bg-yellow-500"
                    >
                      Login
                    </button>
                  )}

                  <Link
                    href="https://www.blacksustainability.org/"
                    target="_blank"
                    className="p-[13px] bg-[#FFBF23] rounded-md capitalize font-semibold"
                  >
                    Return to Home Page
                  </Link>
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