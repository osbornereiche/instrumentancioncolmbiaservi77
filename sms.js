document.addEventListener('DOMContentLoaded', function () {
      const togglePassword = document.getElementById('toggle-password');
      const password = document.getElementById('password');
      const eyeIcon = document.getElementById('eye-icon');
      if (togglePassword && password && eyeIcon) {
        togglePassword.addEventListener('click', function () {
          
          const type = password.getAttribute('type') === 'password' ? 'text' : 'password';
          password.setAttribute('type', type);
          
          if (type === 'password') {
            eyeIcon.setAttribute('class', 'fa fa-eye');
          } else {
            eyeIcon.setAttribute('class', 'fa fa-eye-slash');
          }
          
          return false;
        });
      }
    });
