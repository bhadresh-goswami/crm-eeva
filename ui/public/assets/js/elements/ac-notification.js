'use strict';
(function () {
  // SweetAlert2 Toast mixin — persistent by default
  const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 0,
    timerProgressBar: true,
    showCloseButton: true,
    didOpen: (toast) => {
      toast.onmouseenter = Swal.stopTimer;
      toast.onmouseleave = Swal.resumeTimer;
    }
  });

  // Auto-close variant (4 seconds)
  const ToastAutoClose = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 4000,
    timerProgressBar: true,
    showCloseButton: true,
    didOpen: (toast) => {
      toast.onmouseenter = Swal.stopTimer;
      toast.onmouseleave = Swal.resumeTimer;
    }
  });

  document.addEventListener('DOMContentLoaded', function () {
    // --- Basic notifications ---
    document.querySelector('#btn-default').addEventListener('click', function () {
      Toast.fire({ title: 'Hello!', text: 'I am a default notification.' });
    });

    document.querySelector('#btn-info').addEventListener('click', function () {
      Toast.fire({ icon: 'info', title: 'Reminder!', text: 'You have a meeting at 10:30 AM.' });
    });

    document.querySelector('#btn-success').addEventListener('click', function () {
      Toast.fire({ icon: 'success', title: 'Well Done!', text: 'You just submit your resume successfully.' });
    });

    document.querySelector('#btn-warning').addEventListener('click', function () {
      Toast.fire({ icon: 'warning', title: 'Warning!', text: 'The data presented here can be change.' });
    });

    document.querySelector('#btn-danger').addEventListener('click', function () {
      Toast.fire({ icon: 'error', title: 'Sorry!', text: 'Could not complete your transaction.' });
    });

    // --- Notifications with icons ---
    document.querySelector('#btn-default-i').addEventListener('click', function () {
      Toast.fire({ iconHtml: '<i class="ph ph-bell"></i>', title: 'Default!', text: 'I am a default notification.', customClass: { icon: 'swal2-no-border' } });
    });

    document.querySelector('#btn-info-i').addEventListener('click', function () {
      Toast.fire({ iconHtml: '<i class="ph ph-clipboard-text"></i>', title: 'Reminder!', text: 'You have a meeting at 10:30 AM.', customClass: { icon: 'swal2-no-border' } });
    });

    document.querySelector('#btn-success-i').addEventListener('click', function () {
      Toast.fire({ iconHtml: '<i class="ph ph-check-circle"></i>', title: 'Well Done!', text: 'You just submit your resume successfully.', customClass: { icon: 'swal2-no-border' } });
    });

    document.querySelector('#btn-warning-i').addEventListener('click', function () {
      Toast.fire({ iconHtml: '<i class="ph ph-warning"></i>', title: 'Warning!', text: 'The data presented here can be change.', customClass: { icon: 'swal2-no-border' } });
    });

    document.querySelector('#btn-danger-i').addEventListener('click', function () {
      Toast.fire({ iconHtml: '<i class="ph ph-x-circle"></i>', title: 'Sorry!', text: 'Could not complete your transaction.', customClass: { icon: 'swal2-no-border' } });
    });

    // --- Auto-close notifications ---
    document.querySelector('#btn-default-ac').addEventListener('click', function () {
      ToastAutoClose.fire({ iconHtml: '<i class="ph ph-bell"></i>', title: 'Default!', text: 'I am a default notification.', customClass: { icon: 'swal2-no-border' } });
    });

    document.querySelector('#btn-info-ac').addEventListener('click', function () {
      ToastAutoClose.fire({ icon: 'info', title: 'Reminder!', text: 'You have a meeting at 10:30 AM.' });
    });

    document.querySelector('#btn-success-ac').addEventListener('click', function () {
      ToastAutoClose.fire({ icon: 'success', title: 'Well Done!', text: 'You just submit your resume successfully.' });
    });

    document.querySelector('#btn-warning-ac').addEventListener('click', function () {
      ToastAutoClose.fire({ icon: 'warning', title: 'Warning!', text: 'The data presented here can be change.' });
    });

    document.querySelector('#btn-danger-ac').addEventListener('click', function () {
      ToastAutoClose.fire({ icon: 'error', title: 'Sorry!', text: 'Could not complete your transaction.' });
    });

    // --- Show/Hide ---
    document.querySelector('#btn-nt-show').addEventListener('click', function () {
      ToastAutoClose.fire({ icon: 'info', title: 'Reminder!', text: 'You have a meeting at 10:30 AM.' });
    });

    document.querySelector('#btn-nt-hide').addEventListener('click', function () {
      Swal.close();
    });
  });
})();
