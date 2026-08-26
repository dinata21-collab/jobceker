var API_URL = 'http://localhost:3000/api';

window.app = function () {
  return {
      page: 'home',
    user: null,
    token: null,
    jobs: [],
    error: '',
    success: '',
    loading: false,
    showModal: false,
    showApplyModal: false,
    editingJob: null,
    adminTab: 'jobs',
    applications: [],
    appliedJobs: [],
    myApplications: [],
    superadminTab: 'overview',
    allJobs: [],
    allUsers: [],
    superStats: {},
    applyJobTitle: '',
    applyJobCompany: '',
    applyJobId: 0,
    applyForm: {
      fullName: '',
      phone: '',
      cvFile: null,
      photoFile: null,
    },
    form: {
      name: '',
      email: '',
      password: '',
      role: 'jobseeker',
      resetCode: '',
      newPassword: '',
      title: '',
      companyName: '',
      description: '',
      location: '',
      salary: '',
      deadline: '',
    },

    init: function () {
      var savedToken = localStorage.getItem('token');
      var savedUser = localStorage.getItem('user');
      if (savedToken && savedUser) {
        this.token = savedToken;
        this.user = JSON.parse(savedUser);
      }
      this.loadJobs();
      if (this.user && this.user.role === 'jobseeker') this.loadAppliedJobs();
    },

    navigate: function (page) {
      this.page = page;
      this.error = '';
      this.success = '';
      this.adminTab = 'jobs';
      if (page === 'home') { this.loadJobs(); }
      if (page === 'jobs') {
        this.loadJobs();
        if (this.user && this.user.role === 'jobseeker') this.loadAppliedJobs();
      }
      if (page === 'history') this.loadMyApplications();
      if (page === 'admin') {
        this.loadMyJobs();
        this.loadApplications();
      }
      if (page === 'developer') {
        this.loadSuperStats();
        this.loadAllJobs();
      }
    },

    login: async function () {
      this.loading = true;
      this.error = '';
      try {
        var res = await fetch(API_URL + '/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: this.form.email, password: this.form.password }),
        });
        var data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Login gagal');

        this.token = data.token;
        this.user = data.user;
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        this.form.email = '';
        this.form.password = '';
        this.navigate(data.user.role === 'admin' ? 'admin' : 'jobs');
      } catch (err) {
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    },

    register: async function () {
      this.loading = true;
      this.error = '';
      this.success = '';
      try {
        var res = await fetch(API_URL + '/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: this.form.name,
            email: this.form.email,
            password: this.form.password,
            role: this.form.role,
          }),
        });
        var data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Register gagal');

        this.success = 'Register berhasil! Silakan login.';
        this.form.name = '';
        this.form.email = '';
        this.form.password = '';
        this.form.role = 'jobseeker';
        var self = this;
        setTimeout(function () { self.navigate('login'); }, 1500);
      } catch (err) {
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    },

    forgotPassword: async function () {
      this.loading = true;
      this.error = '';
      this.success = '';
      try {
        var res = await fetch(API_URL + '/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: this.form.email }),
        });
        var data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Gagal mengirim kode');

        this.success = 'Kode reset: ' + data.code + ' (berlaku 15 menit)';
        var self = this;
        setTimeout(function () { self.navigate('reset'); }, 3000);
      } catch (err) {
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    },

    resetPassword: async function () {
      this.loading = true;
      this.error = '';
      this.success = '';
      try {
        var res = await fetch(API_URL + '/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: this.form.email,
            code: this.form.resetCode,
            newPassword: this.form.newPassword,
          }),
        });
        var data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Gagal reset password');

        this.success = 'Password berhasil diubah! Silakan login.';
        this.form.email = '';
        this.form.resetCode = '';
        this.form.newPassword = '';
        var self = this;
        setTimeout(function () { self.navigate('login'); }, 2000);
      } catch (err) {
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    },

    logout: function () {
      this.user = null;
      this.token = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      this.navigate('home');
    },

    loadJobs: async function () {
      try {
        var res = await fetch(API_URL + '/jobs');
        var data = await res.json();
        this.jobs = data.data || [];
      } catch (err) {
        console.error('Gagal load jobs:', err);
      }
    },

    loadMyJobs: async function () {
      try {
        var res = await fetch(API_URL + '/jobs/my', {
          headers: { Authorization: 'Bearer ' + this.token },
        });
        var data = await res.json();
        this.jobs = data.data || [];
      } catch (err) {
        console.error('Gagal load my jobs:', err);
      }
    },

    loadAppliedJobs: async function () {
      try {
        var res = await fetch(API_URL + '/applications/my', {
          headers: { Authorization: 'Bearer ' + this.token },
        });
        var data = await res.json();
        this.appliedJobs = data.data || [];
      } catch (err) {
        console.error('Gagal load applied jobs:', err);
      }
    },

    isApplied: function (jobId) {
      return this.appliedJobs.indexOf(jobId) !== -1;
    },

    isExpired: function (deadline) {
      if (!deadline) return false;
      return new Date(deadline) < new Date();
    },

    loadMyApplications: async function () {
      try {
        var res = await fetch(API_URL + '/applications/history', {
          headers: { Authorization: 'Bearer ' + this.token },
        });
        var data = await res.json();
        this.myApplications = data.data || [];
      } catch (err) {
        console.error('Gagal load riwayat lamaran:', err);
      }
    },

    openModal: function (job) {
      this.editingJob = job || null;
      if (job) {
        this.form.title = job.title;
        this.form.companyName = job.companyName;
        this.form.description = job.description;
        this.form.location = job.location || '';
        this.form.salary = job.salary || '';
        this.form.deadline = job.deadline ? job.deadline.split('T')[0] : '';
      } else {
        this.form.title = '';
        this.form.companyName = '';
        this.form.description = '';
        this.form.location = '';
        this.form.salary = '';
        this.form.deadline = '';
      }
      this.showModal = true;
    },

    editJob: function (job) {
      this.openModal(job);
    },

    saveJob: async function () {
      var body = {
        title: this.form.title,
        companyName: this.form.companyName,
        description: this.form.description,
        location: this.form.location,
        salary: this.form.salary,
        deadline: this.form.deadline || null,
      };

      try {
        var url = this.editingJob
          ? API_URL + '/jobs/' + this.editingJob.id
          : API_URL + '/jobs';
        var method = this.editingJob ? 'PUT' : 'POST';

        var res = await fetch(url, {
          method: method,
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + this.token,
          },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          var data = await res.json();
          throw new Error(data.error || 'Gagal menyimpan job');
        }

        this.showModal = false;
        this.editingJob = null;
        if (this.user && this.user.role === 'admin') {
          await this.loadMyJobs();
        } else {
          await this.loadJobs();
        }
      } catch (err) {
        this.error = err.message;
      }
    },

    deleteJob: async function (id) {
      if (!confirm('Yakin ingin menghapus job ini?')) return;

      try {
        var res = await fetch(API_URL + '/jobs/' + id, {
          method: 'DELETE',
          headers: { Authorization: 'Bearer ' + this.token },
        });

        if (!res.ok) throw new Error('Gagal menghapus job');
        if (this.user && this.user.role === 'admin') {
          await this.loadMyJobs();
        } else {
          await this.loadJobs();
        }
      } catch (err) {
        this.error = err.message;
      }
    },

    openApplyModal: function (job) {
      this.applyJobId = job.id;
      this.applyJobTitle = job.title;
      this.applyJobCompany = job.companyName;
      this.applyForm.fullName = this.user ? this.user.name : '';
      this.applyForm.phone = '';
      this.applyForm.cvFile = null;
      this.applyForm.photoFile = null;
      this.error = '';
      this.success = '';
      this.showApplyModal = true;
    },

    submitApplication: async function () {
      if (!this.applyJobId) {
        this.error = 'Terjadi kesalahan, silakan tutup dan buka ulang modal';
        return;
      }

      this.loading = true;
      this.error = '';

      try {
        var formData = new FormData();
        formData.append('jobId', this.applyJobId);
        formData.append('fullName', this.applyForm.fullName);
        formData.append('phone', this.applyForm.phone);
        if (this.applyForm.cvFile) formData.append('cv', this.applyForm.cvFile);
        if (this.applyForm.photoFile) formData.append('photo', this.applyForm.photoFile);

        var res = await fetch(API_URL + '/applications', {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + this.token },
          body: formData,
        });

        var data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Gagal mengirim lamaran');

        this.success = 'Lamaran berhasil dikirim!';
        this.applyForm.fullName = '';
        this.applyForm.phone = '';
        this.applyForm.cvFile = null;
        this.applyForm.photoFile = null;
        await this.loadAppliedJobs();
        var self = this;
        setTimeout(function () { self.showApplyModal = false; self.success = ''; }, 1500);
      } catch (err) {
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    },

    loadApplications: async function () {
      try {
        var res = await fetch(API_URL + '/applications', {
          headers: { Authorization: 'Bearer ' + this.token },
        });
        var data = await res.json();
        this.applications = data.data || [];
      } catch (err) {
        console.error('Gagal load applications:', err);
      }
    },

    updateStatus: async function (id, status) {
      try {
        var res = await fetch(API_URL + '/applications/' + id + '/status', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + this.token,
          },
          body: JSON.stringify({ status: status }),
        });

        if (!res.ok) throw new Error('Gagal update status');
        await this.loadApplications();
      } catch (err) {
        this.error = err.message;
      }
    },

    exportExcel: async function () {
      try {
        var res = await fetch(API_URL + '/applications/export', {
          headers: { Authorization: 'Bearer ' + this.token },
        });
        if (!res.ok) throw new Error('Gagal download');
        var blob = await res.blob();
        var url = window.URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'lamaran.xlsx';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } catch (err) {
        this.error = err.message;
      }
    },

    loadSuperStats: async function () {
      try {
        var res = await fetch(API_URL + '/superadmin/stats', {
          headers: { Authorization: 'Bearer ' + this.token },
        });
        var data = await res.json();
        this.superStats = data.data || {};
      } catch (err) {
        console.error('Gagal load stats:', err);
      }
    },

    loadAllJobs: async function () {
      try {
        var res = await fetch(API_URL + '/superadmin/jobs', {
          headers: { Authorization: 'Bearer ' + this.token },
        });
        var data = await res.json();
        this.allJobs = data.data || [];
      } catch (err) {
        console.error('Gagal load all jobs:', err);
      }
    },

    loadAllUsers: async function () {
      try {
        var res = await fetch(API_URL + '/superadmin/users', {
          headers: { Authorization: 'Bearer ' + this.token },
        });
        var data = await res.json();
        this.allUsers = data.data || [];
      } catch (err) {
        console.error('Gagal load all users:', err);
      }
    },

    superDeleteJob: async function (id) {
      if (!confirm('Yakin ingin menghapus job ini?')) return;
      try {
        var res = await fetch(API_URL + '/superadmin/jobs/' + id, {
          method: 'DELETE',
          headers: { Authorization: 'Bearer ' + this.token },
        });
        if (!res.ok) throw new Error('Gagal menghapus job');
        await this.loadAllJobs();
        await this.loadSuperStats();
      } catch (err) {
        this.error = err.message;
      }
    },

    superDeleteUser: async function (id) {
      if (!confirm('Yakin ingin menghapus user ini? Semua data terkait akan ikut terhapus.')) return;
      try {
        var res = await fetch(API_URL + '/superadmin/users/' + id, {
          method: 'DELETE',
          headers: { Authorization: 'Bearer ' + this.token },
        });
        if (!res.ok) throw new Error('Gagal menghapus user');
        await this.loadAllUsers();
        await this.loadSuperStats();
      } catch (err) {
        this.error = err.message;
      }
    },
  };
};
