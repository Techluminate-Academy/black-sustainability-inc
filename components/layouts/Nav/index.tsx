"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import icons from "@/icons";
import { useRouter } from "next/router";
import toast from "react-hot-toast";
import MapHelpIcon from "@/features/memberMap/MapHelpIcon";
import MapHelpModal from "@/features/memberMap/MapHelpModal";
import MemberMapProfileModal from "@/features/memberMap/MemberMapProfileModal";
import UpdateProfileModal from "@/features/memberMap/UpdateProfileModal";
import UpdateLocationModal from "@/features/memberMap/UpdateLocationModal";

interface IProps {
  isAuthenticated: boolean;
  authenticatedUser: any;
  startTour?: () => void;
}

const MOBILE_MENU_MS = 300;

const Nav: React.FC<IProps> = ({ isAuthenticated, authenticatedUser, startTour }) => {
  const pathname = usePathname();
  const [isMobileNavOpen, setMobileNavOpen] = useState(false);
  const [mobileMenuMounted, setMobileMenuMounted] = useState(false);
  const [mobileMenuVisible, setMobileMenuVisible] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [updateProfileModalOpen, setUpdateProfileModalOpen] = useState(false);
  const [updateLocationModalOpen, setUpdateLocationModalOpen] = useState(false);
  const [updateLocationForced, setUpdateLocationForced] = useState(false);
  const [updateLocationNextPath, setUpdateLocationNextPath] = useState("/");
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const router = useRouter();

  const openMobileNav = () => {
    setMobileMenuMounted(true);
    setMobileNavOpen(true);
  };

  const closeMobileNav = () => {
    setMobileNavOpen(false);
  };

  const toggleMobileNav = () => {
    if (isMobileNavOpen) closeMobileNav();
    else openMobileNav();
  };

  useEffect(() => {
    if (!mobileMenuMounted) {
      setMobileMenuVisible(false);
      return;
    }
    if (!isMobileNavOpen) {
      setMobileMenuVisible(false);
      return;
    }
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setMobileMenuVisible(true));
    });
    return () => cancelAnimationFrame(id);
  }, [mobileMenuMounted, isMobileNavOpen]);

  useEffect(() => {
    if (isMobileNavOpen) setMobileMenuMounted(true);
  }, [isMobileNavOpen]);

  useEffect(() => {
    if (isMobileNavOpen || !mobileMenuMounted) return;
    const timer = window.setTimeout(() => setMobileMenuMounted(false), MOBILE_MENU_MS);
    return () => clearTimeout(timer);
  }, [isMobileNavOpen, mobileMenuMounted]);

  useEffect(() => {
    if (!isMobileNavOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMobileNav();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isMobileNavOpen]);

  const openProfileModal = () => {
    setProfileModalOpen(true);
  };

  const openUpdateProfileModal = () => {
    setUpdateProfileModalOpen(true);
  };

  const openUpdateLocationModal = (opts?: { forced?: boolean; nextPath?: string }) => {
    setUpdateLocationForced(opts?.forced ?? false);
    setUpdateLocationNextPath(
      opts?.nextPath?.startsWith("/") ? opts.nextPath : "/"
    );
    setUpdateLocationModalOpen(true);
  };

  const openEditProfileFromViewModal = () => {
    setProfileModalOpen(false);
    setUpdateProfileModalOpen(true);
  };

  const openHelpModal = () => {
    setHelpModalOpen(true);
  };

  useEffect(() => {
    if (!router.isReady || router.query.updateProfile !== "1") return;
    setUpdateProfileModalOpen(true);
    const q = { ...router.query };
    delete q.updateProfile;
    void router.replace({ pathname: router.pathname, query: q }, undefined, { shallow: true });
  }, [router.isReady, router.query.updateProfile, router.pathname, router]);

  useEffect(() => {
    if (!router.isReady || router.query.updateLocation !== "1") return;
    const nextRaw = router.query.next;
    const nextPath =
      typeof nextRaw === "string" && nextRaw.startsWith("/") ? nextRaw : "/";
    setUpdateLocationForced(router.query.forced === "1");
    setUpdateLocationNextPath(nextPath);
    setUpdateLocationModalOpen(true);
    const q = { ...router.query };
    delete q.updateLocation;
    delete q.forced;
    delete q.next;
    void router.replace({ pathname: router.pathname, query: q }, undefined, { shallow: true });
  }, [router.isReady, router.query.updateLocation, router.query.forced, router.query.next, router.pathname, router]);

  const parsedUser = authenticatedUser || null;

  const desktopNavBtn =
    "inline-flex items-center justify-center min-h-[40px] px-3.5 xl:px-4 rounded-lg border border-gray-300 bg-white text-gray-800 font-inter text-[11px] xl:text-xs font-semibold uppercase tracking-wide whitespace-nowrap shadow-sm transition hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-1";
  const desktopNavAccent =
    "inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3.5 xl:px-4 rounded-lg bg-[#FFBF23] text-gray-900 font-inter text-[11px] xl:text-xs font-semibold uppercase tracking-wide whitespace-nowrap shadow-sm transition hover:bg-yellow-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFBF23] focus-visible:ring-offset-1";
  const desktopNavGreen =
    "inline-flex items-center justify-center min-h-[40px] px-4 rounded-lg bg-green-600 text-white font-inter text-xs font-semibold uppercase tracking-wide whitespace-nowrap shadow-sm transition hover:bg-green-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-1";
  const desktopHelpBtn =
    "inline-flex items-center justify-center min-h-[40px] min-w-[40px] rounded-lg border border-gray-300 bg-white text-gray-800 shadow-sm transition hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-1";

  const mobileNavLink =
    "w-full min-h-[48px] inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-6 py-3 text-center font-semibold uppercase text-xs tracking-wide text-gray-800 shadow-sm transition hover:bg-gray-50";
  const mobileNavAccent =
    "w-full min-h-[48px] inline-flex items-center justify-center gap-2 rounded-lg bg-[#FFBF23] px-6 py-3 text-center font-semibold uppercase text-xs tracking-wide text-gray-900 shadow-sm transition hover:bg-yellow-400";
  const mobileNavGreen =
    "w-full min-h-[48px] inline-flex items-center justify-center rounded-lg bg-green-600 px-6 py-3 text-center font-semibold uppercase text-xs tracking-wide text-white shadow-sm transition hover:bg-green-700";

  const mobileMenuMotion = mobileMenuVisible
    ? "opacity-100 translate-y-0"
    : "opacity-0 translate-y-3";
  const mobileMenuItemAnim = (delayMs: number) => ({
    className: [
      "transition-all duration-300 ease-in-out",
      mobileMenuVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
    ].join(" "),
    style: { transitionDelay: mobileMenuVisible ? `${delayMs}ms` : "0ms" } as React.CSSProperties,
  });

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
    <>
    <nav className="bg-white w-full fixed top-0 left-0 !z-[9999] font-lexen">
      <div className="max-container">
        <div className="flex items-center justify-between gap-4 py-4 lg:py-3">
          <Link href="/" className="shrink-0">
            <img
              className="h-[56px] w-auto max-w-[200px] xl:h-[64px] xl:max-w-[219px]"
              src="/png/LOGO.png"
              alt="BSI Logo"
              draggable={false}
            />
          </Link>

          {/* Mobile Toggle */}
          <button
            type="button"
            onClick={toggleMobileNav}
            className="lg:hidden text-black-600 focus:outline-none"
            data-testid="nav-mobile-menu-toggle"
            aria-label="Open menu"
          >
            {icons.BurgerIcon()}
          </button>

          {/* Desktop Nav */}
          <div
            className="hidden lg:flex flex-1 items-center justify-end min-w-0 pl-4 xl:pl-8"
            data-testid="nav-desktop-actions"
          >
            <div className="flex flex-wrap items-center justify-end gap-2 xl:gap-2.5">
              {isAuthenticated ? (
                <div
                  className="flex flex-wrap items-center gap-2 xl:gap-2.5 pr-2 xl:pr-3 border-r border-gray-200"
                  role="group"
                  aria-label="Your account"
                >
                  <button
                    type="button"
                    data-testid="nav-my-profile"
                    className={desktopNavBtn}
                    onClick={openUpdateProfileModal}
                  >
                    My profile
                  </button>
                  <button
                    type="button"
                    data-testid="nav-my-location"
                    className={desktopNavBtn}
                    onClick={() => openUpdateLocationModal()}
                  >
                    My location
                  </button>
                  <button
                    type="button"
                    className={desktopNavBtn}
                    onClick={() => void handleLogout()}
                  >
                    Log out
                  </button>
                  <button
                    type="button"
                    data-testid="nav-profile-photo"
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-gray-200 bg-gray-50 transition hover:border-green-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-1"
                    aria-label="View my map profile"
                    aria-haspopup="dialog"
                    onClick={openProfileModal}
                  >
                    <div className="relative h-8 w-8">
                      <Image
                        src={
                          parsedUser?.profile?.profilePhoto?.url
                            ? decodeURIComponent(parsedUser.profile.profilePhoto.url)
                            : "/png/default.png"
                        }
                        alt=""
                        fill
                        className="rounded-full object-cover"
                      />
                    </div>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className={desktopNavGreen}
                  onClick={() => router.push("/signin")}
                >
                  Login
                </button>
              )}

              <div
                className="flex flex-wrap items-center gap-2 xl:gap-2.5"
                role="group"
                aria-label="Help and site links"
              >
                <button
                  type="button"
                  data-testid="nav-map-help"
                  className={desktopHelpBtn}
                  aria-label="Map help and support"
                  aria-haspopup="dialog"
                  onClick={openHelpModal}
                  title="Map help"
                >
                  <MapHelpIcon />
                </button>

                {startTour && (
                  <div className="relative group">
                    <button
                      type="button"
                      onClick={startTour}
                      className={desktopNavAccent}
                      aria-label="Take a guided tour of the map features"
                    >
                      <span aria-hidden="true">🎯</span>
                      <span>Take a tour</span>
                    </button>
                    <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-64 -translate-x-1/2 rounded-lg bg-black p-3 text-xs text-white opacity-0 shadow-lg invisible transition-all duration-200 group-hover:visible group-hover:opacity-100">
                      <div className="space-y-2 text-left">
                        <p className="font-semibold">Map tour guide</p>
                        <ul className="list-disc space-y-1 pl-4">
                          <li>Click to start an interactive tour</li>
                          <li>Learn about map features and navigation</li>
                          <li>Discover how to find and add locations</li>
                          <li>Use arrow keys or Next/Back</li>
                        </ul>
                        <p className="mt-2 text-[#FFBF23]">Click the button to begin.</p>
                      </div>
                      <div className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-full">
                        <div className="border-8 border-transparent border-t-black" />
                      </div>
                    </div>
                  </div>
                )}

                <Link
                  href="https://www.blacksustainability.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={desktopNavAccent}
                >
                  Return home
                </Link>
              </div>
            </div>
          </div>

          {/* Mobile Nav */}
          {mobileMenuMounted && (
            <div
              className={`lg:hidden fixed inset-0 z-[10001] overflow-y-auto bg-black/40 transition-opacity duration-300 ease-in-out ${
                mobileMenuVisible ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
              }`}
              data-testid="nav-mobile-menu"
              aria-hidden={!isMobileNavOpen}
            >
              <button
                type="button"
                className="absolute inset-0 cursor-default"
                aria-label="Close menu"
                tabIndex={-1}
                onClick={closeMobileNav}
              />
              <div
                className={`relative flex min-h-full flex-col font-inter text-sm transition-opacity duration-300 ease-in-out ${mobileMenuMotion}`}
              >
                <div
                  className={`flex shrink-0 items-center justify-between bg-transparent px-5 py-4 transition-transform duration-300 ease-in-out ${
                    mobileMenuVisible ? "translate-y-0" : "-translate-y-2"
                  }`}
                >
                  <Link href="/" onClick={closeMobileNav}>
                    <img
                      className="h-[56px] w-auto max-w-[200px]"
                      src="/png/LOGO.png"
                      alt="BSI Logo"
                      draggable={false}
                    />
                  </Link>
                  <button
                    type="button"
                    onClick={closeMobileNav}
                    className="relative z-10 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md bg-white/90 text-gray-800 shadow-sm backdrop-blur-sm hover:bg-white focus:outline-none"
                    aria-label="Close menu"
                  >
                    {icons.BurgerIcon()}
                  </button>
                </div>

                <nav
                  className={`relative z-10 flex flex-1 flex-col items-center justify-center gap-3 px-6 py-8 w-full max-w-sm mx-auto transition-all duration-300 ease-in-out ${mobileMenuMotion}`}
                >
                  {isAuthenticated ? (
                    <>
                      <button
                        type="button"
                        data-testid="nav-my-profile"
                        className={`${mobileNavLink} ${mobileMenuItemAnim(0).className}`}
                        style={mobileMenuItemAnim(0).style}
                        onClick={() => {
                          closeMobileNav();
                          openUpdateProfileModal();
                        }}
                      >
                        My profile
                      </button>
                      <button
                        type="button"
                        data-testid="nav-my-location"
                        className={`${mobileNavLink} ${mobileMenuItemAnim(50).className}`}
                        style={mobileMenuItemAnim(50).style}
                        onClick={() => {
                          closeMobileNav();
                          openUpdateLocationModal();
                        }}
                      >
                        My location
                      </button>
                      <button
                        type="button"
                        className={`${mobileNavLink} ${mobileMenuItemAnim(100).className}`}
                        style={mobileMenuItemAnim(100).style}
                        onClick={() => {
                          closeMobileNav();
                          void handleLogout();
                        }}
                      >
                        Log out
                      </button>
                      <button
                        type="button"
                        data-testid="nav-profile-photo"
                        className={`mt-1 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 shadow-sm transition hover:bg-gray-50 ${mobileMenuItemAnim(150).className}`}
                        style={mobileMenuItemAnim(150).style}
                        aria-label="View my map profile"
                        aria-haspopup="dialog"
                        onClick={() => {
                          closeMobileNav();
                          openProfileModal();
                        }}
                      >
                        <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full">
                          <Image
                            src={
                              parsedUser?.profile?.profilePhoto?.url
                                ? decodeURIComponent(parsedUser.profile.profilePhoto.url)
                                : "/png/default.png"
                            }
                            alt=""
                            fill
                            className="object-cover"
                          />
                        </div>
                        <span className="text-xs font-semibold uppercase tracking-wide text-gray-800">
                          View profile
                        </span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className={`${mobileNavGreen} ${mobileMenuItemAnim(0).className}`}
                      style={mobileMenuItemAnim(0).style}
                      onClick={() => {
                        closeMobileNav();
                        router.push("/signin");
                      }}
                    >
                      Login
                    </button>
                  )}

                  <button
                    type="button"
                    data-testid="nav-map-help-mobile"
                    className={`${mobileNavLink} ${mobileMenuItemAnim(isAuthenticated ? 200 : 50).className}`}
                    style={mobileMenuItemAnim(isAuthenticated ? 200 : 50).style}
                    aria-label="Map help and support"
                    aria-haspopup="dialog"
                    onClick={() => {
                      closeMobileNav();
                      openHelpModal();
                    }}
                  >
                    <MapHelpIcon />
                    <span>Map help</span>
                  </button>

                  {startTour && (
                    <button
                      type="button"
                      className={`${mobileNavAccent} ${mobileMenuItemAnim(isAuthenticated ? 250 : 100).className}`}
                      style={mobileMenuItemAnim(isAuthenticated ? 250 : 100).style}
                      aria-label="Take a guided tour of the map features"
                      onClick={() => {
                        closeMobileNav();
                        startTour();
                      }}
                    >
                      <span aria-hidden="true">🎯</span>
                      <span>Take a tour</span>
                    </button>
                  )}

                  <Link
                    href="https://www.blacksustainability.org/"
                    target="_blank"
                    className={`${mobileNavAccent} ${mobileMenuItemAnim(isAuthenticated ? 300 : 150).className}`}
                    style={mobileMenuItemAnim(isAuthenticated ? 300 : 150).style}
                    onClick={closeMobileNav}
                  >
                    Return to home page
                  </Link>
                </nav>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
    <MapHelpModal isOpen={helpModalOpen} onClose={() => setHelpModalOpen(false)} />
    {isAuthenticated && (
      <>
        <MemberMapProfileModal
          isOpen={profileModalOpen}
          onClose={() => setProfileModalOpen(false)}
          onEditProfile={openEditProfileFromViewModal}
          onOpenUpdateLocation={() => {
            setProfileModalOpen(false);
            openUpdateLocationModal();
          }}
          sessionUser={parsedUser}
        />
        <UpdateProfileModal
          isOpen={updateProfileModalOpen}
          onClose={() => setUpdateProfileModalOpen(false)}
          onSaved={() => router.reload()}
          onOpenUpdateLocation={() => {
            setUpdateProfileModalOpen(false);
            openUpdateLocationModal();
          }}
          sessionUser={parsedUser}
        />
        <UpdateLocationModal
          isOpen={updateLocationModalOpen}
          onClose={() => setUpdateLocationModalOpen(false)}
          forced={updateLocationForced}
          nextPath={updateLocationNextPath}
          sessionUser={parsedUser}
        />
      </>
    )}
    </>
  );
};

export default Nav;
