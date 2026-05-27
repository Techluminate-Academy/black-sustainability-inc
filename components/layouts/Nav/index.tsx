"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useState } from "react";
import { usePathname } from "next/navigation";
import icons from "@/icons";
import { useRouter } from "next/router";
import toast from "react-hot-toast";

interface IProps {
  isAuthenticated: boolean;
  authenticatedUser: any;
  startTour?: () => void;
}

const Nav: React.FC<IProps> = ({ isAuthenticated, authenticatedUser, startTour }) => {
  const pathname = usePathname();
  const [isMobileNavOpen, setMobileNavOpen] = useState(false);
  const router = useRouter();
  const toggleMobileNav = () => setMobileNavOpen(!isMobileNavOpen);
  
  const parsedUser = authenticatedUser || null;

  const greenBtn = "py-2 px-4 bg-green-500 text-white rounded-md font-semibold uppercase text-xs transition hover:bg-green-600";
  const mutedBtn =
    "py-2 px-4 border border-gray-300 text-gray-800 rounded-md font-semibold uppercase text-xs transition hover:bg-gray-50";

  const handleLogout = async () => {
    const loadingId = toast.loading("Signing out…");
    try {
      const res = await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error("Logout failed");
      toast.success("You're signed out.", { id: loadingId });
      setTimeout(() => {
        window.location.href = "/";
      }, 600);
    } catch {
      toast.error("Could not sign out. Try again.", { id: loadingId });
    }
  };

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
                <Link
                  href="/update-location?next=/"
                  data-testid="nav-my-location"
                  className={mutedBtn}
                >
                  My location
                </Link>
                <button type="button" className={mutedBtn} onClick={handleLogout}>
                  Log out
                </button>
                <Link
                  href="/update-location?next=/"
                  data-testid="nav-profile-photo"
                  className="flex space-x-2 rounded-full focus:outline-none focus:ring-2 focus:ring-green-600"
                  aria-label="Update my map location"
                >
                  <div className="relative w-7 h-7">
                    <Image
                      src={parsedUser?.profile?.profilePhoto?.url ? decodeURIComponent(parsedUser.profile.profilePhoto.url) : "/png/default.png"}
                      alt="user"
                      fill
                      className="rounded-full object-cover"
                    />
                  </div>
                </Link>
              </>
            ) : (
              <button className={greenBtn} onClick={() => router.push("/signin")}>
                Login
              </button>
            )}

            {startTour && (
              <div className="relative group">
                <button
                  onClick={startTour}
                  className="p-[13px] bg-[#FFBF23] rounded-md capitalize font-semibold hover:bg-yellow-500 transition-colors"
                  aria-label="Take a guided tour of the map features"
                >
                  🎯 Take a Tour
                </button>
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-3 bg-black text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 shadow-lg">
                  <div className="text-left space-y-2">
                    <p className="font-semibold">Map Tour Guide:</p>
                    <ul className="list-disc pl-4 space-y-1">
                      <li>Click to start an interactive tour</li>
                      <li>Learn about map features & navigation</li>
                      <li>Discover how to find & add locations</li>
                      <li>Use arrow keys or click Next/Back</li>
                    </ul>
                    <p className="text-[#FFBF23] mt-2">Hover here for guide, click button to start!</p>
                  </div>
                  {/* Arrow */}
                  <div className="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-full">
                    <div className="border-8 border-transparent border-t-black"></div>
                  </div>
                </div>
              </div>
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
                      <Link
                        href="/update-location?next=/"
                        data-testid="nav-my-location"
                        className={mutedBtn}
                        onClick={() => toggleMobileNav()}
                      >
                        My location
                      </Link>
                      <button
                        type="button"
                        className={mutedBtn}
                        onClick={() => {
                          toggleMobileNav();
                          void handleLogout();
                        }}
                      >
                        Log out
                      </button>
                      <Link
                        href="/update-location?next=/"
                        data-testid="nav-profile-photo"
                        className="flex space-x-2 rounded-full"
                        aria-label="Update my map location"
                        onClick={() => toggleMobileNav()}
                      >
                        <div className="relative w-4 h-4">
                          <Image
                            src={parsedUser?.profile?.profilePhoto?.url ? decodeURIComponent(parsedUser.profile.profilePhoto.url) : "/png/default.png"}
                            alt="user"
                            fill
                            className="rounded-full object-cover"
                          />
                        </div>
                      </Link>
                    </>
                  ) : (
                    <button
                      className={greenBtn}
                      onClick={() => {
                        toggleMobileNav();
                        router.push("/signin");
                      }}
                    >
                      Login
                    </button>
                  )}

                  {startTour && (
                    <div className="relative group">
                      <button
                        onClick={() => {
                          toggleMobileNav();
                          startTour();
                        }}
                        className="p-[13px] bg-[#FFBF23] rounded-md capitalize font-semibold hover:bg-yellow-500 transition-colors"
                        aria-label="Take a guided tour of the map features"
                      >
                        🎯 Take a Tour
                      </button>
                      {/* Mobile Tooltip */}
                      <div className="absolute top-full left-0 mt-2 w-64 p-3 bg-black text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 shadow-lg">
                        <div className="text-left space-y-2">
                          <p className="font-semibold">Map Tour Guide:</p>
                          <ul className="list-disc pl-4 space-y-1">
                            <li>Tap to start an interactive tour</li>
                            <li>Learn about map features & navigation</li>
                            <li>Discover how to find & add locations</li>
                            <li>Use Next/Back buttons to navigate</li>
                          </ul>
                          <p className="text-[#FFBF23] mt-2">Tap button to begin!</p>
                        </div>
                      </div>
                    </div>
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
