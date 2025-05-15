// Clears the cookie and optionally redirects to Wix logout
export default function handler(req, res) {
    res.setHeader('Set-Cookie', [
        `bsn_user_data=; Path=/; Domain=.blacksustainability.org; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure; SameSite=None`,
    ]);

    // After logout, redirect to Wix logout endpoint
    res.status(200).json({ success: true, message: "Next.js logout successful" });
}
