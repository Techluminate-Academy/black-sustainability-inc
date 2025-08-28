// Script to set a test authentication cookie
const mockUserData = {
  fields: {
    "PHOTO": [{
      url: "https://picsum.photos/200" // Random profile image for testing
    }],
    "EMAIL ADDRESS": "test@example.com",
    "FIRST NAME": "Test",
    "LAST NAME": "User",
    "MEMBER LEVEL": ["Premium"],
    "ORGANIZATION NAME": "Test Org"
  }
};

// Set the cookie
document.cookie = `bsn_user_data=${JSON.stringify(mockUserData)}; path=/; max-age=3600`;

console.log('Test authentication cookie has been set! You should now see the profile image in the navbar.');
console.log('To clear the test auth, run: document.cookie = "bsn_user_data=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";');
