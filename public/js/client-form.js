document.addEventListener('DOMContentLoaded', () => {
    preSelectPlan();
    initContactForm();
});

// 1. Pre-select plan dropdown based on URL query parameter (?plan=growth)
function preSelectPlan() {
    const params = new URLSearchParams(window.location.search);
    const plan = params.get('plan');
    const serviceSelect = document.getElementById('service');

    if (!serviceSelect || !plan) return;

    // Map plan query strings to option values
    if (plan === 'startup') {
        serviceSelect.value = 'posts';
    } else if (plan === 'growth') {
        serviceSelect.value = 'reels';
    } else if (plan === 'scale') {
        serviceSelect.value = 'custom';
    }
}

// 2. Handle AJAX form submission to backend Node/Express API
function initContactForm() {
    const contactForm = document.getElementById('contactForm');
    const alertMessage = document.getElementById('alertMessage');

    if (!contactForm) return;

    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Retrieve field values
        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const service = document.getElementById('service').value;
        const message = document.getElementById('message').value.trim();

        // Client side validation
        if (!name || !email || !message) {
            showAlert('Please fill in all required fields marked with *', 'error');
            return;
        }

        if (!validateEmail(email)) {
            showAlert('Please enter a valid email address.', 'error');
            return;
        }

        // Show sending state
        const submitBtn = contactForm.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Sending Message... <i class="fa-solid fa-spinner fa-spin"></i>';

        try {
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name,
                    email,
                    phone,
                    service,
                    message
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                showAlert(data.message, 'success');
                contactForm.reset();
            } else {
                showAlert(data.message || 'Something went wrong. Please try again.', 'error');
            }
        } catch (error) {
            console.error('API submission error:', error);
            showAlert('Failed to connect to the server. Please check if backend is running.', 'error');
        } finally {
            // Restore button state
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        }
    });

    // Helper to display alerts
    function showAlert(text, type) {
        alertMessage.textContent = text;
        alertMessage.className = `alert-message ${type}`;
        alertMessage.style.display = 'block';

        // Scroll to alert for small screen visibility
        alertMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // Helper for email regex validation
    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
}
