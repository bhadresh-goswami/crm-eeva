'use strict';
(function () {
  document.addEventListener('DOMContentLoaded', function () {
    var forms = document.querySelectorAll('.needs-validation');
    Array.prototype.slice.call(forms).forEach(function (form) {
      // Password match validation
      var confirmPassword = form.querySelector('#confirm-password');
      var password = form.querySelector('#password');
      if (confirmPassword && password) {
        confirmPassword.addEventListener('input', function () {
          if (confirmPassword.value !== password.value) {
            confirmPassword.setCustomValidity('Passwords do not match');
          } else {
            confirmPassword.setCustomValidity('');
          }
        });
        password.addEventListener('input', function () {
          if (confirmPassword.value && confirmPassword.value !== password.value) {
            confirmPassword.setCustomValidity('Passwords do not match');
          } else {
            confirmPassword.setCustomValidity('');
          }
        });
      }

      form.addEventListener(
        'submit',
        function (event) {
          if (!form.checkValidity()) {
            event.preventDefault();
            event.stopPropagation();
          }
          form.classList.add('was-validated');
        },
        false
      );
    });
  });
})();
