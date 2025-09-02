// Smooth scrolling for navbar links
document.querySelectorAll(".nav-link").forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();
    const targetId = this.getAttribute("href");
    document.querySelector(targetId).scrollIntoView({ behavior: "smooth" });
    const navbarNav = document.getElementById("navbarNav");
    if (window.innerWidth <= 768) {
      navbarNav.classList.remove("active");
    }
  });
});

// Color scheme switcher
const colorSchemes = ["skyblue-theme", "orange-theme", "teal-theme"];
let currentSchemeIndex = 0;
if (!document.body.classList.length) {
  document.body.classList.add(colorSchemes[0]);
}
function switchColorScheme() {
  document.body.classList.remove(colorSchemes[currentSchemeIndex]);
  currentSchemeIndex = (currentSchemeIndex + 1) % colorSchemes.length;
  document.body.classList.add(colorSchemes[currentSchemeIndex]);
}
document
  .getElementById("themeSwitch")
  .addEventListener("click", switchColorScheme);

// Hamburger menu toggle
const menuToggle = document.getElementById("menuToggle");
const navbarNav = document.getElementById("navbarNav");
if (menuToggle && navbarNav) {
  menuToggle.addEventListener("click", () => {
    navbarNav.classList.toggle("active");
  });
}

// --- Get references to the new and existing elements ---
const authButtons = document.getElementById("authButtons");
const userInfo = document.getElementById("userInfo");
const usernameDisplay = document.getElementById("usernameDisplay");
const logoutBtn = document.getElementById("logoutBtn");
const messageBox = document.getElementById("messageBox");
const messageContent = document.getElementById("messageContent");
const adminDashboard = document.getElementById("admin-dashboard");

// Get references to the contact form inputs
const contactNameInput = document.getElementById("contact-name");
const contactEmailInput = document.getElementById("contact-email");
const contactPhoneInput = document.getElementById("contact-phone");
const contactForm = document.querySelector(".contact-section form");

// Get references to the login and signup forms
const loginPopup = document.getElementById("loginPopup");
const signupPopup = document.getElementById("signupPopup");
const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");
const closeLogin = document.getElementById("closeLogin");
const closeSignup = document.getElementById("closeSignup");
const switchToSignup = document.getElementById("switchToSignup");
const switchToLogin = document.getElementById("switchToLogin");
const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");

// NEW: Get references to admin dashboard elements for autocomplete
const adminSearchInput = document.getElementById("admin-search-input");
const autocompleteResults = document.getElementById("autocomplete-results");
const adminUserDetails = document.getElementById("admin-user-details");
let selectedIndex = -1; // To track the selected suggestion for keyboard navigation

// NEW: Function to clear the login and signup forms
function clearAuthForms() {
  if (loginForm) {
    loginForm.reset();
  }
  if (signupForm) {
    signupForm.reset();
  }
}

// Custom Message Box Functions
function showMessage(message, isSuccess) {
  messageContent.textContent = message;
  messageBox.style.display = "block";
  messageBox.style.backgroundColor = isSuccess
    ? "#4ade80" /* green-400 */
    : "#ef4444"; /* red-500 */
  messageBox.style.color = isSuccess ? "#18181b" /* zinc-900 */ : "#ffffff";

  setTimeout(() => {
    messageBox.style.display = "none";
  }, 3000);
}

// NEW: Debounce function to limit API calls
function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

// NEW: Function to fetch and display autocomplete suggestions
const fetchAutocompleteSuggestions = async (searchTerm) => {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user || user.role !== "admin") {
    return;
  }

  if (searchTerm.length < 1) {
    autocompleteResults.innerHTML = "";
    autocompleteResults.style.display = "none";
    return;
  }
  try {
    const response = await fetch(
      `/admin/search-users-autocomplete?q=${searchTerm}&adminUser=${user.username}`
    );
    const data = await response.json();

    if (data.success) {
      displaySuggestions(data.users);
    } else {
      console.error("Autocomplete error:", data.message);
      displaySuggestions([]);
    }
  } catch (err) {
    console.error("Error fetching autocomplete suggestions:", err);
    displaySuggestions([]);
  }
};

// NEW: Debounced version of the fetch function
const debouncedFetchSuggestions = debounce(fetchAutocompleteSuggestions, 300);

// NEW: Function to display the suggestions with new styles and click listener
const displaySuggestions = (users) => {
  autocompleteResults.innerHTML = "";
  if (users.length > 0) {
    users.forEach((username) => {
      const suggestionItem = document.createElement("div");
      suggestionItem.textContent = username;
      suggestionItem.classList.add("admin-suggestion-item");
      suggestionItem.addEventListener("click", () => {
        selectSuggestion(username);
      });
      autocompleteResults.appendChild(suggestionItem);
    });
    autocompleteResults.style.display = "block";
  } else {
    autocompleteResults.style.display = "none";
  }
  selectedIndex = -1; // Reset selection on new suggestions
};

// NEW: Function to handle selecting a suggestion (either by click or Enter)
const selectSuggestion = async (username) => {
  adminSearchInput.value = username;
  autocompleteResults.style.display = "none";
  await fetchUserDetails(username);
};

// NEW: Function to fetch and display full user details
const fetchUserDetails = async (username) => {
  const adminMessageElement = document.getElementById("admin-message");
  adminMessageElement.textContent = "";

  try {
    const response = await fetch(
      `/admin/search-user?username=${encodeURIComponent(username)}`
    );
    const data = await response.json();

    if (data.success) {
      const user = data.user;

      // Populate the main contact form
      contactNameInput.value = user.username;
      contactEmailInput.value = user.email;
      contactPhoneInput.value = user.phone;

      showMessage(`User '${username}' data populated successfully.`, true);
    } else {
      adminMessageElement.textContent = data.message;

      // Clear contact form if user is not found
      contactNameInput.value = "";
      contactEmailInput.value = "";
      contactPhoneInput.value = "";

      showMessage(data.message, false);
    }
  } catch (error) {
    console.error("Error fetching user details:", error);
    adminMessageElement.textContent =
      "Error fetching user details. Please try again.";
    showMessage("Error fetching user details.", false);
  }
};

// NEW: Event listener for keyboard navigation
adminSearchInput.addEventListener("keydown", (e) => {
  const items = autocompleteResults.querySelectorAll(".admin-suggestion-item");
  if (items.length === 0) return;

  if (e.key === "ArrowDown") {
    e.preventDefault();
    selectedIndex = (selectedIndex + 1) % items.length;
    updateSelection(items);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    selectedIndex = (selectedIndex - 1 + items.length) % items.length;
    updateSelection(items);
  } else if (e.key === "Enter") {
    e.preventDefault();
    if (selectedIndex > -1) {
      items[selectedIndex].click();
    }
  }
});

// NEW: Function to highlight the selected item
const updateSelection = (items) => {
  items.forEach((item, index) => {
    item.classList.remove("selected");
    if (index === selectedIndex) {
      item.classList.add("selected");
      // Optional: update the input field value with the selected suggestion
      adminSearchInput.value = item.textContent;
    }
  });
};

// NEW: Event listener for input field and click outside
if (adminSearchInput) {
  // Listen for input events to trigger autocomplete
  adminSearchInput.addEventListener("input", (e) => {
    debouncedFetchSuggestions(e.target.value);
  });

  // Hide suggestions when clicking outside
  document.addEventListener("click", (e) => {
    if (
      !autocompleteResults.contains(e.target) &&
      e.target !== adminSearchInput
    ) {
      autocompleteResults.style.display = "none";
    }
  });
}

// Function to update UI based on login state
const updateNavbarState = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  if (user) {
    authButtons.style.display = "none";
    userInfo.style.display = "flex";
    usernameDisplay.textContent = `Hi, ${user.username}`;

    // Show/hide admin dashboard based on user role
    if (user.role === "admin") {
      adminDashboard.style.display = "block";
    } else {
      adminDashboard.style.display = "none";
    }
  } else {
    authButtons.style.display = "flex";
    userInfo.style.display = "none";
    adminDashboard.style.display = "none";
  }
};

const fetchAndPopulateUserInfo = async () => {
  const user = JSON.parse(localStorage.getItem("user"));
  if (user && user.username) {
    try {
      const response = await fetch(`/user-info?username=${user.username}`);
      const data = await response.json();
      if (data.success) {
        contactNameInput.value = data.user.username;
        contactEmailInput.value = data.user.email;
        contactPhoneInput.value = data.user.phone;
      } else {
        console.error("Failed to fetch user data:", data.message);
      }
    } catch (err) {
      console.error("Error fetching user info:", err);
    }
  }
};

// MODIFIED: Function to handle logout
const handleLogout = () => {
  localStorage.removeItem("user");
  updateNavbarState();
  // Clear all forms on logout for a clean state
  clearAuthForms();
  if (contactNameInput) contactNameInput.value = "";
  if (contactEmailInput) contactEmailInput.value = "";
  if (contactPhoneInput) contactPhoneInput.value = "";
  showMessage("You have been logged out.", true);
};

if (logoutBtn) {
  logoutBtn.addEventListener("click", handleLogout);
}

if (loginBtn && loginPopup) {
  loginBtn.addEventListener("click", () => {
    loginPopup.classList.add("active");
  });
}
if (signupBtn && signupPopup) {
  signupBtn.addEventListener("click", () => {
    signupPopup.classList.add("active");
  });
}
if (closeLogin) {
  closeLogin.addEventListener("click", () => {
    loginPopup.classList.remove("active");
  });
}
if (closeSignup) {
  closeSignup.addEventListener("click", () => {
    signupPopup.classList.remove("active");
  });
}
if (switchToSignup) {
  switchToSignup.addEventListener("click", (e) => {
    e.preventDefault();
    loginPopup.classList.remove("active");
    signupPopup.classList.add("active");
  });
}
if (switchToLogin) {
  switchToLogin.addEventListener("click", (e) => {
    e.preventDefault();
    signupPopup.classList.remove("active");
    loginPopup.classList.add("active");
  });
}

// MODIFIED: Form submission handling to process JSON
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(loginForm);
    try {
      const response = await fetch("/login", {
        method: "POST",
        body: new URLSearchParams(formData),
      });
      const data = await response.json();
      if (data.success) {
        loginPopup.classList.remove("active");
        localStorage.setItem("user", JSON.stringify(data.user));
        updateNavbarState();
        fetchAndPopulateUserInfo();
        showMessage(data.message, true);
        clearAuthForms(); // NEW: Clear the form after a successful login
      } else {
        showMessage(data.message, false);
      }
    } catch (err) {
      console.error("Login error:", err);
      showMessage("Error during login", false);
    }
  });
}

if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(signupForm);
    try {
      const response = await fetch("/signup", {
        method: "POST",
        body: new URLSearchParams(formData),
      });
      const data = await response.json();

      showMessage(data.message, data.success);

      if (data.success) {
        signupPopup.classList.remove("active");
        loginPopup.classList.add("active");
        clearAuthForms(); // NEW: Clear the form after a successful signup
      }
    } catch (err) {
      console.error("Signup error:", err);
      showMessage("Error during signup", false);
    }
  });
}

// Contact form validation and submission
if (contactForm) {
  contactForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    const email = document.getElementById("contact-email").value;
    const phone = document.getElementById("contact-phone").value;
    const message = document.getElementById("contact-message").value;
    const name = document.getElementById("contact-name").value;

    if (
      !email.includes("@") ||
      phone.length < 10 ||
      message.length < 5 ||
      name.length < 2
    ) {
      showMessage(
        "Please enter a valid name, email, phone (min 10 digits), and message (min 5 characters).",
        false
      );
      return;
    }

    try {
      const formData = new URLSearchParams({
        name,
        email,
        phone,
        message,
      });
      const response = await fetch("/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData,
      });
      const data = await response.json();
      if (data.success) {
        showMessage(data.message, true);
        document.getElementById("contact-name").value = "";
        document.getElementById("contact-email").value = "";
        document.getElementById("contact-phone").value = "";
        document.getElementById("contact-message").value = "";
        adminSearchInput.value = ""; // NEW: Clear the search bar
        fetchAndPopulateUserInfo();
      } else {
        showMessage(data.message, false);
      }
    } catch (error) {
      console.error("Form submission error:", error);
      showMessage(
        "Network error. Please check your connection and try again.",
        false
      );
    }
  });
}

// MODIFIED: Check the login state and populate forms on page load
document.addEventListener("DOMContentLoaded", () => {
  updateNavbarState();
  fetchAndPopulateUserInfo();
  clearAuthForms(); // NEW: Clear the forms when the page first loads
});
