$(function() {
    const $form = $('#contact-form');
    const $successMessage = $('#success-message');
    const $errorMessage = $('#error-message');

    if ($form.length === 0) return;

    $form.on('submit', function(e) {
        e.preventDefault();

        // Clear previous alerts
        $successMessage.addClass('hidden').hide();
        $errorMessage.addClass('hidden').hide();

        const firstName = $('#first-name').val() || '';
        const lastName = $('#last-name').val() || '';
        const email = $('#email').val() || '';
        const subject = $('#subject').val() || '';
        const message = $('#message').val() || '';

        const name = (firstName + ' ' + lastName).trim();

        const payload = {
            name: name,
            email: email,
            phone: 'N/A', // contact form has no phone field, default to N/A
            service: subject,
            message: message
        };

        // Submit form via AJAX
        $.ajax({
            type: 'POST',
            url: '/api/contact',
            data: JSON.stringify(payload),
            contentType: 'application/json',
            success: function(response) {
                if (response.success) {
                    $successMessage.removeClass('hidden').fadeIn();
                    $form.trigger('reset');
                } else {
                    $errorMessage.removeClass('hidden').fadeIn();
                }
            },
            error: function() {
                $errorMessage.removeClass('hidden').fadeIn();
            }
        });
    });
});
