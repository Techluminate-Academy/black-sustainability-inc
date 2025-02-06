import icons from "@/icons";
import Link from "next/link";
import React from "react";

const Footer = () => {
  return (
    <div className="bg-[#FFBF23]">
      <footer className=" max-container text-black min-h-[50vh] py-[104px]">
        <div className="flex flex-wrap  md:justify-between justify-center md:space-y-0 space-y-20 items-start">
          <div className="md:w-1/2 w-full">
            <img
              src="/png/LOGO.png"
              alt="bsi logo"
              className="w-[311px] h-[100px]"
            />
          </div>
          <div className="md:w-1/2 w-full">
            <div className="flex justify-between items-start text-sm font-semibold">
              <div className="flex flex-col space-y-5">
                <Link
                  href="https://www.blacksustainability.org/about"
                  target="_blank"
                >
                  About
                </Link>
                <Link
                  href="https://www.blacksustainability.org/join-our-network"
                  target="_blank"
                >
                  People
                </Link>
                <Link
                  href="https://www.blacksustainability.org/ways-to-invest"
                  target="_blank"
                >
                  Fundraising
                </Link>
              </div>
              <div className="flex flex-col space-y-5">
                <Link href="">Grants</Link>
                <Link
                  href="https://www.blacksustainability.org/"
                  target="_blank"
                >
                  Contact Us
                </Link>
                <Link
                  href="https://www.blacksustainability.org/join-our-network"
                  target="_blank"
                >
                  Membership Directory
                </Link>
              </div>
              {/* <div className="flex flex-col space-y-5">
                <Link href="">Resource Hub</Link>
                <Link href="">FAQs</Link>
              </div> */}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap  md:justify-between justify-center md:space-y-0 space-y-20 items-center mt-20">
          <div className="flex items-center gap-x-1.5 text-xs ">
            <icons.c />
            <span>2023</span>
            <span>Black Sustainability.</span>
            <span>All rights reserved.</span>
            <Link
              href="https://www.blacksustainability.org/terms-of-use"
              target="_blank"
              className="font-semibold"
            >
              Privacy Policy
            </Link>
            <span>and</span>
            <Link
              href="https://www.blacksustainability.org/terms-of-use"
              target="_blank"
              className="font-semibold"
            >
              Terms of Use.
            </Link>
          </div>
          <div className="flex items-center gap-x-2 text-xs ">
            <Link
              href="https://web.facebook.com/BlackSustainabilitySummit/?_rdc=1&_rdr"
              target="_blank"
            >
              <icons.FB />
            </Link>
            <Link
              href="https://www.instagram.com/Black.Sustainability/"
              target="_blank"
            >
              <icons.IG />
            </Link>
            <Link href="https://x.com/blacksustain" target="_blank">
              <icons.X />
            </Link>
            <Link
              href="https://www.youtube.com/c/BlackSustainabilitySummit"
              target="_blank"
            >
              <icons.YT />
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Footer;
