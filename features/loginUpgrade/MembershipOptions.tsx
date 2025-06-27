import Link from 'next/link';

const CheckIcon = () => (
  <svg
    className="w-5 h-5 text-red-500 mr-3 flex-shrink-0"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
      clipRule="evenodd"
    />
  </svg>
);

interface MembershipOptionsProps {
  onReturn: () => void;
}

const MembershipOptions: React.FC<MembershipOptionsProps> = ({ onReturn }) => {
  return (
    <div className="w-full py-8">
      {/* Congratulations Section */}
      <div className="text-center mb-12">
        <div className="bg-green-50 rounded-lg p-8 mb-8 max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-green-800 mb-4">
            🎉 Congratulations!
          </h2>
          <p className="text-lg text-green-700 mb-6">
            Your profile has been successfully updated. You're now ready to upgrade your membership and unlock more features!
          </p>
          <div className="flex justify-center gap-4">
            <button
              onClick={onReturn}
              className="px-6 py-3 bg-white text-green-700 border-2 border-green-600 rounded-lg font-semibold hover:bg-green-50 transition-colors"
            >
              ← Return to Profile Form
            </button>
          </div>
        </div>
        <h3 className="text-2xl font-bold mb-4">Choose Your Membership Level</h3>
        <p className="text-gray-600 max-w-2xl mx-auto mb-8">
          Each membership tier offers unique benefits and features to help you expand your network and impact in our Black and Green ecosystem. Select the membership tier that best fits your needs.
        </p>
      </div>

      <div className="inline-flex justify-center w-full gap-8">
        
        {/* ENTHUSIAST Card */}
        <div className="w-[350px] rounded-lg overflow-hidden flex flex-col shadow-lg border border-gray-200" style={{marginRight: 10}}>
          <div className="bg-yellow-400 p-6 text-center">
            <h2 className="text-2xl font-bold mb-4 text-black">ENTHUSIAST</h2>
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <span className="text-2xl">$</span>
                <span className="text-5xl font-bold">9.99</span>
              </div>
              <p className="text-gray-600 mb-6">
                Every month
                <br />
                Or $105/Year
              </p>
            </div>
            <Link
              href="https://www.blacksustainability.org/plans-pricing/payment/eyJwbGFuSWQiOiIzZjI1MDVmYy05ZGU4LTQzYjctOTVhOC03ZTY0MzQzYjlmYzYiLCJpbnRlZ3JhdGlvbkRhdGEiOnt9LCJjaGVja291dEZsb3dJZCI6ImFhNDEzOTA3LTEzZTMtNDE0OC05MTNmLTE5MjY2ZmFlNGI3NiJ9"
              className="block w-full bg-black text-white text-center py-3 rounded-lg font-bold mt-6 hover:bg-gray-800 transition-colors"
            >
              REGISTER
            </Link>
          </div>
          <div className="bg-white p-6 flex-grow">
            <div className="space-y-4">
              {[
                "Access to private social network",
                "Database listing & VIEW ONLY access",
                "Access workshops/trainings",
                "Discuss solutions to community challenges",
                "Wider network of community support",
                "Discount to annual summit",
                "25% of membership is an investment into RBG Impact Fund"
              ].map((benefit) => (
                <div key={benefit} className="flex items-start">
                  <CheckIcon />
                  <span className="text-black">{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* EXPERT Card */}
        <div className="w-[350px] rounded-lg overflow-hidden flex flex-col shadow-lg border border-gray-200" style={{marginRight: 10}}>
          <div className="bg-yellow-400 p-6 text-center">
            <h2 className="text-2xl font-bold mb-4 text-black">EXPERT</h2>
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <span className="text-2xl">$</span>
                <span className="text-5xl font-bold">29.99</span>
              </div>
              <p className="text-gray-600 mb-6">
                Every month
                <br />
                Or $325/Year
              </p>
            </div>
            <Link
              href="https://www.blacksustainability.org/plans-pricing/payment/eyJwbGFuSWQiOiI3MjRkYjdmMS03Yjk1LTRlYjktYjcxZi0zMTg1ZWYxMjYzNzEiLCJpbnRlZ3JhdGlvbkRhdGEiOnt9LCJjaGVja291dEZsb3dJZCI6IjA5OGRhZGY2LWFkZTQtNDcwYi1iMDljLTg0MzE0MTlhYTQ4YyJ9"
              className="block w-full bg-black text-white text-center py-3 rounded-lg font-bold mt-6 hover:bg-gray-800 transition-colors"
            >
              REGISTER
            </Link>
          </div>
          <div className="bg-white p-6 flex-grow">
            <div className="space-y-4">
              {[
                "ENTHUSIAST BENEFITS AND...",
                "Database listing & FULL access",
                "Host workshops/trainings",
                "Partner with like-minded, qualified organizations",
                "Deepen your work/expertise",
                "Earn Black BELT* (Black Environmental Leadership Trainer)",
                "Exchange Community-Defined & Owned Data"
              ].map((benefit) => (
                <div key={benefit} className="flex items-start">
                  <CheckIcon />
                  <span className="text-black">{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* ENTITY Card */}
        <div className="w-[350px] rounded-lg overflow-hidden flex flex-col shadow-lg relative border-2 border-yellow-500">
          <div className="absolute top-0 right-0 bg-yellow-400 text-black px-4 py-1 rounded-bl-lg font-bold text-sm">
            Full Access
          </div>
          <div className="bg-black p-6 text-center">
            <h2 className="text-2xl font-bold mb-4 text-white">ENTITY</h2>
            <div className="text-center text-white">
              <div className="flex items-center justify-center mb-2">
                <span className="text-2xl">$</span>
                <span className="text-5xl font-bold">59.99</span>
              </div>
              <p className="text-white mb-6">
                Every month
                <br />
                Or $655/Year
              </p>
            </div>
            <Link
              href="https://www.blacksustainability.org/plans-pricing/payment/eyJwbGFuSWQiOiJiYzYwZDYxMi1lNGQ3LTRlM2QtODY0Yi0zNWYzNmM4NGY0ZjIiLCJpbnRlZ3JhdGlvbkRhdGEiOnt9LCJjaGVja291dEZsb3dJZCI6IjZlNGYxODk2LTMxMWMtNGFmZi1iMDdiLTNmNDM2MjBjYjM5MCJ9"
              className="block w-full bg-white text-black text-center py-3 rounded-lg font-bold mt-6 hover:bg-gray-200 transition-colors"
            >
              REGISTER
            </Link>
          </div>
          <div className="bg-green-600 p-6 flex-grow">
            <div className="space-y-4">
              {[
                "I'm a Black-owned & operated organization in sustainability!",
                "Expert Member Benefits AND...",
                "Organizational Listing & Feature",
                "Post job opportunities/contracts",
                "Create a subnetwork for your community on our platform",
                "Offer and/or obtain CEU's",
                "Participate in our Affiliate/Referral Program"
              ].map((benefit) => (
                <div key={benefit} className="flex items-start">
                  <CheckIcon />
                  <span className="text-black">{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default MembershipOptions; 