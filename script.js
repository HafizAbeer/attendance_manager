const STORAGE_KEY_STUDENTS = "attendance_students";
const STORAGE_KEY_ATTENDANCE = "attendance_records";
const STORAGE_KEY_SUBJECTS = "attendance_subjects";

class DataManager {
  static getStudents() {
    const students = localStorage.getItem(STORAGE_KEY_STUDENTS);
    return students ? JSON.parse(students) : [];
  }

  static saveStudents(students) {
    localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(students));
  }

  static getSubjects() {
    const subjects = localStorage.getItem(STORAGE_KEY_SUBJECTS);
    return subjects ? JSON.parse(subjects) : [];
  }

  static saveSubjects(subjects) {
    localStorage.setItem(STORAGE_KEY_SUBJECTS, JSON.stringify(subjects));
  }

  static addSubject(name) {
    const subjects = this.getSubjects();
    if (!subjects.includes(name)) {
      subjects.push(name);
      this.saveSubjects(subjects);
      return true;
    }
    return false;
  }

  static deleteSubject(name) {
    let subjects = this.getSubjects();
    subjects = subjects.filter((s) => s !== name);
    this.saveSubjects(subjects);
  }

  static getAttendanceRecords() {
    const recordsStr = localStorage.getItem(STORAGE_KEY_ATTENDANCE);
    if (!recordsStr) return {};

    let records = JSON.parse(recordsStr);

    let migrated = false;
    Object.keys(records).forEach((date) => {
      if (Array.isArray(records[date])) {
        const subjects = this.getSubjects();
        const defaultSub = subjects.length > 0 ? subjects[0] : "General";

        if (defaultSub === "General") this.addSubject("General");

        records[date] = {
          [defaultSub]: records[date],
        };
        migrated = true;
      }
    });

    if (migrated) {
      localStorage.setItem(STORAGE_KEY_ATTENDANCE, JSON.stringify(records));
    }

    return records;
  }

  static saveAttendanceRecord(date, subject, absentIds) {
    const records = this.getAttendanceRecords();
    if (!records[date]) {
      records[date] = {};
    }
    records[date][subject] = absentIds;
    localStorage.setItem(STORAGE_KEY_ATTENDANCE, JSON.stringify(records));
  }

  static addStudent(name, rollNo) {
    const students = this.getStudents();
    const newStudent = {
      id: crypto.randomUUID(),
      name: name,
      rollNo: rollNo,
      createdAt: new Date().toISOString(),
    };
    students.push(newStudent);
    this.saveStudents(students);
    return newStudent;
  }

  static deleteStudent(id) {
    let students = this.getStudents();
    students = students.filter((s) => s.id !== id);
    this.saveStudents(students);
  }

  static updateStudent(id, newName, newRollNo) {
    const students = this.getStudents();
    const student = students.find((s) => s.id === id);
    if (student) {
      student.name = newName;
      if (newRollNo) student.rollNo = newRollNo;
      this.saveStudents(students);
    }
  }
}

class UIController {
  constructor() {
    this.dateEl = document.getElementById("current-date");
    this.attendanceListEl = document.getElementById("attendance-list");
    this.studentsListEl = document.getElementById("students-list");
    this.subjectsListEl = document.getElementById("subjects-list");
    this.reportsListEl = document.getElementById("reports-list");

    this.addStudentForm = document.getElementById("add-student-form");
    this.newStudentNameInput = document.getElementById("new-student-name");
    this.newRollNoInput = document.getElementById("new-roll-no");

    this.addSubjectForm = document.getElementById("add-subject-form");
    this.newSubjectNameInput = document.getElementById("new-subject-name");

    this.finalizeBtn = document.getElementById("finalize-btn");
    this.attendanceSubjectSelect = document.getElementById(
      "attendance-subject-select"
    );
    this.reportsSubjectSelect = document.getElementById(
      "reports-subject-select"
    );

    this.modal = document.getElementById("summary-modal");
    this.emptyStateAttendance = document.getElementById(
      "empty-state-attendance"
    );
    this.emptyStateStudents = document.getElementById("empty-state-students");
    this.emptyStateSubjects = document.getElementById("empty-state-subjects");

    this.navBtns = document.querySelectorAll(".nav-btn");
    this.views = document.querySelectorAll(".view-section");

    this.currentDate = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    this.currentAttendanceSubject = "";
    this.currentReportSubject = "";
    this.temporaryAttendanceState = {};

    this.init();
  }

  init() {
    this.renderDate();
    this.setupEventListeners();
    this.loadSubjectsView();
    this.loadStudentsView();

    this.populateSubjectDropdowns();
  }

  renderDate() {
    const options = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    this.dateEl.textContent = new Date().toLocaleDateString(undefined, options);
  }

  setupEventListeners() {
    this.navBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        this.switchTab(btn.dataset.tab);
      });
    });

    this.addStudentForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = this.newStudentNameInput.value.trim();
      const rollNo = this.newRollNoInput.value.trim();

      if (name && rollNo) {
        DataManager.addStudent(name, rollNo);
        this.newStudentNameInput.value = "";
        this.newRollNoInput.value = "";
        this.showToast("Student added successfully", "success");
        this.loadStudentsView();
      }
    });

    this.addSubjectForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = this.newSubjectNameInput.value.trim();
      if (name) {
        if (DataManager.addSubject(name)) {
          this.newSubjectNameInput.value = "";
          this.showToast("Subject added successfully", "success");
          this.loadSubjectsView();
          this.populateSubjectDropdowns();
        } else {
          this.showToast("Subject already exists", "error");
        }
      }
    });

    this.attendanceSubjectSelect.addEventListener("change", (e) => {
      this.currentAttendanceSubject = e.target.value;
      this.loadAttendanceView();
    });

    this.reportsSubjectSelect.addEventListener("change", (e) => {
      this.currentReportSubject = e.target.value;
      this.loadReportsView();
    });

    this.finalizeBtn.addEventListener("click", () => {
      this.finalizeAttendance();
    });

    document.getElementById("close-modal-btn").addEventListener("click", () => {
      this.modal.classList.add("hidden");
    });
  }

  switchTab(tabName) {
    this.navBtns.forEach((btn) => {
      if (btn.dataset.tab === tabName) btn.classList.add("active");
      else btn.classList.remove("active");
    });

    this.views.forEach((view) => {
      if (view.id === `${tabName}-view`) view.classList.add("active");
      else view.classList.remove("active");
    });

    if (tabName === "reports") {
      this.loadReportsView();
    }
    if (tabName === "attendance") {
      this.loadAttendanceView();
    }
    if (tabName === "subjects") {
      this.loadSubjectsView();
    }
  }

  populateSubjectDropdowns() {
    const subjects = DataManager.getSubjects();

    const populate = (select, currentVal) => {
      select.innerHTML = '<option value="">Select Subject</option>';
      subjects.forEach((sub) => {
        const opt = document.createElement("option");
        opt.value = sub;
        opt.textContent = sub;
        if (sub === currentVal) opt.selected = true;
        select.appendChild(opt);
      });
    };

    populate(this.attendanceSubjectSelect, this.currentAttendanceSubject);
    populate(this.reportsSubjectSelect, this.currentReportSubject);
  }

  refreshAllViews() {
    this.loadSubjectsView();
    this.populateSubjectDropdowns();
    this.loadStudentsView();
    this.loadAttendanceView();
    this.loadReportsView();
  }

  loadSubjectsView() {
    const subjects = DataManager.getSubjects();
    this.subjectsListEl.innerHTML = "";

    if (subjects.length === 0) {
      this.emptyStateSubjects.classList.remove("hidden");
    } else {
      this.emptyStateSubjects.classList.add("hidden");
    }

    subjects.forEach((sub, index) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
                <td>${index + 1}</td>
                <td>${sub}</td>
                <td>
                    <button class="btn btn-sm btn-danger delete-sub-btn" data-name="${sub}">Delete</button>
                </td>
            `;
      this.subjectsListEl.appendChild(tr);
    });

    this.subjectsListEl.onclick = (e) => {
      if (e.target.classList.contains("delete-sub-btn")) {
        const name = e.target.dataset.name;
        if (confirm(`Delete subject "${name}"?`)) {
          DataManager.deleteSubject(name);
          this.showToast("Subject deleted", "success");

          if (this.currentAttendanceSubject === name)
            this.currentAttendanceSubject = "";
          if (this.currentReportSubject === name)
            this.currentReportSubject = "";

          this.loadSubjectsView();
          this.populateSubjectDropdowns();
        }
      }
    };
  }

  loadStudentsView() {
    const students = DataManager.getStudents();
    this.studentsListEl.innerHTML = "";

    if (students.length === 0) {
      this.emptyStateStudents.classList.remove("hidden");
      return;
    } else {
      this.emptyStateStudents.classList.add("hidden");
    }

    const stats = this.getGlobalStats();

    students.forEach((student, index) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
                <td>${index + 1}</td>
                <td>
                    <span class="editable-roll" data-id="${student.id}">${
        student.rollNo || "N/A"
      }</span>
                    <input type="text" class="edit-input-roll hidden" value="${
                      student.rollNo || ""
                    }" data-id="${student.id}" style="width:80px">
                </td>
                <td>
                    <span class="editable-name" data-id="${student.id}">${
        student.name
      }</span>
                    <input type="text" class="edit-input-name hidden" value="${
                      student.name
                    }" data-id="${student.id}">
                </td>
                <td>${stats[student.id]?.totalAbsent || 0} days</td>
                <td>
                    <button class="btn btn-sm btn-secondary edit-btn" data-id="${
                      student.id
                    }">Edit</button>
                    <button class="btn btn-sm btn-secondary save-btn hidden" data-id="${
                      student.id
                    }">Save</button>
                    <button class="btn btn-sm btn-danger delete-btn" data-id="${
                      student.id
                    }">Delete</button>
                </td>
            `;
      this.studentsListEl.appendChild(tr);
    });

    this.studentsListEl.onclick = (e) => {
      const id = e.target.dataset.id;
      if (e.target.classList.contains("delete-btn")) {
        if (confirm("Are you sure you want to delete this student?")) {
          DataManager.deleteStudent(id);
          this.showToast("Student deleted", "success");
          this.loadStudentsView();
        }
      } else if (e.target.classList.contains("edit-btn")) {
        this.toggleEditMode(e.target.closest("tr"), true);
      } else if (e.target.classList.contains("save-btn")) {
        const tr = e.target.closest("tr");
        const nameInput = tr.querySelector(".edit-input-name");
        const rollInput = tr.querySelector(".edit-input-roll");

        if (nameInput.value.trim() && rollInput.value.trim()) {
          DataManager.updateStudent(
            id,
            nameInput.value.trim(),
            rollInput.value.trim()
          );
          this.toggleEditMode(tr, false);
          this.loadStudentsView();
          this.showToast("Student updated", "success");
        }
      }
    };
  }

  toggleEditMode(tr, isEditing) {
    const nameSpan = tr.querySelector(".editable-name");
    const rollSpan = tr.querySelector(".editable-roll");
    const nameInput = tr.querySelector(".edit-input-name");
    const rollInput = tr.querySelector(".edit-input-roll");
    const editBtn = tr.querySelector(".edit-btn");
    const saveBtn = tr.querySelector(".save-btn");

    if (isEditing) {
      nameSpan.classList.add("hidden");
      rollSpan.classList.add("hidden");

      nameInput.classList.remove("hidden");
      rollInput.classList.remove("hidden");

      editBtn.classList.add("hidden");
      saveBtn.classList.remove("hidden");
      nameInput.focus();
    } else {
      nameSpan.classList.remove("hidden");
      rollSpan.classList.remove("hidden");

      nameInput.classList.add("hidden");
      rollInput.classList.add("hidden");

      editBtn.classList.remove("hidden");
      saveBtn.classList.add("hidden");
    }
  }

  loadAttendanceView() {
    this.attendanceListEl.innerHTML = "";

    if (!this.currentAttendanceSubject) {
      this.emptyStateAttendance.textContent =
        "Please select a subject to take attendance.";
      this.emptyStateAttendance.classList.remove("hidden");
      this.finalizeBtn.disabled = true;
      return;
    }

    const students = DataManager.getStudents();

    if (students.length === 0) {
      this.emptyStateAttendance.textContent =
        "No students found. Go to 'Students' tab to add some.";
      this.emptyStateAttendance.classList.remove("hidden");
      this.finalizeBtn.disabled = true;
      return;
    } else {
      this.emptyStateAttendance.classList.add("hidden");
      this.finalizeBtn.disabled = false;
    }

    const records = DataManager.getAttendanceRecords();
    const todayRecord = records[this.currentDate]
      ? records[this.currentDate][this.currentAttendanceSubject]
      : null;

    students.forEach((student, index) => {
      let isAbsent = false;

      if (todayRecord) {
        isAbsent = todayRecord.includes(student.id);
      }

      this.temporaryAttendanceState[student.id] = !isAbsent;

      const tr = document.createElement("tr");
      tr.innerHTML = `
                <td>${index + 1}</td>
                <td>${student.rollNo || "N/A"}</td>
                <td>${student.name}</td>
                <td>
                    <label class="status-toggle">
                        <input type="checkbox" class="attendance-check" data-id="${
                          student.id
                        }" ${!isAbsent ? "checked" : ""}>
                        <div class="toggle-slider">
                            <span class="toggle-label present-lbl">Present</span>
                            <span class="toggle-label absent-lbl">Absent</span>
                        </div>
                    </label>
                </td>
                <td>
                    <span class="status-text">${
                      !isAbsent ? "Present" : "Absent"
                    }</span>
                </td>
            `;
      this.attendanceListEl.appendChild(tr);
    });

    const checkboxes =
      this.attendanceListEl.querySelectorAll(".attendance-check");
    checkboxes.forEach((chk) => {
      chk.addEventListener("change", (e) => {
        const id = e.target.dataset.id;
        const isPresent = e.target.checked;
        this.temporaryAttendanceState[id] = isPresent;

        const row = e.target.closest("tr");
        row.querySelector(".status-text").textContent = isPresent
          ? "Present"
          : "Absent";
      });
    });

    if (todayRecord) {
      this.finalizeBtn.textContent = "Update Attendance";
    } else {
      this.finalizeBtn.textContent = "Finalize Attendance";
    }
  }

  finalizeAttendance() {
    if (!this.currentAttendanceSubject) return;

    const students = DataManager.getStudents();
    const absentIds = [];
    const absentNames = [];

    students.forEach((s) => {
      if (this.temporaryAttendanceState[s.id] === false) {
        absentIds.push(s.id);
        absentNames.push(s.name);
      }
    });

    DataManager.saveAttendanceRecord(
      this.currentDate,
      this.currentAttendanceSubject,
      absentIds
    );

    this.showFinalizeModal(absentNames);
    this.showToast("Attendance saved successfully!", "success");

    this.loadAttendanceView();
  }

  showFinalizeModal(absentNames) {
    const list = document.getElementById("modal-absent-list");
    list.innerHTML = "";
    document.getElementById(
      "modal-date"
    ).textContent = `${this.currentDate} (${this.currentAttendanceSubject})`;

    if (absentNames.length === 0) {
      const li = document.createElement("li");
      li.textContent = "All students Present!";
      li.style.color = "var(--secondary-color)";
      list.appendChild(li);
    } else {
      absentNames.forEach((name) => {
        const li = document.createElement("li");
        li.textContent = name;
        list.appendChild(li);
      });
    }

    this.modal.classList.remove("hidden");
  }

  getSubjectStats(subject) {
    const records = DataManager.getAttendanceRecords();
    const students = DataManager.getStudents();
    const stats = {};

    students.forEach((s) => {
      stats[s.id] = { totalAbsent: 0, dates: [] };
    });

    if (!subject) return stats;

    for (const [date, subjectsMap] of Object.entries(records)) {
      if (subjectsMap[subject]) {
        subjectsMap[subject].forEach((id) => {
          if (stats[id]) {
            stats[id].totalAbsent++;
            stats[id].dates.push(date);
          }
        });
      }
    }
    return stats;
  }

  getGlobalStats() {
    const records = DataManager.getAttendanceRecords();
    const students = DataManager.getStudents();
    const stats = {};

    students.forEach((s) => {
      stats[s.id] = { totalAbsent: 0 };
    });

    for (const [date, subjectsMap] of Object.entries(records)) {
      Object.values(subjectsMap).forEach((absentIds) => {
        if (Array.isArray(absentIds)) {
          absentIds.forEach((id) => {
            if (stats[id]) stats[id].totalAbsent++;
          });
        }
      });
    }
    return stats;
  }

  loadReportsView() {
    this.reportsListEl.innerHTML = "";

    if (!this.currentReportSubject) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="5" style="text-align:center; color:var(--text-secondary);">Select a subject to view reports</td>`;
      this.reportsListEl.appendChild(tr);

      document.getElementById("total-students-count").textContent = "-";
      document.getElementById("total-days-count").textContent = "-";
      return;
    }

    const students = DataManager.getStudents();
    const stats = this.getSubjectStats(this.currentReportSubject);

    const records = DataManager.getAttendanceRecords();
    let subjectDays = 0;
    for (const date in records) {
      if (records[date][this.currentReportSubject]) subjectDays++;
    }

    document.getElementById("total-students-count").textContent =
      students.length;
    document.getElementById("total-days-count").textContent = subjectDays;

    students.forEach((s, index) => {
      const studentStats = stats[s.id];
      const tr = document.createElement("tr");

      const formattedDates = studentStats.dates.map((dateStr) => {
        const dateObj = new Date(dateStr + "T00:00:00");
        const dayName = dateObj.toLocaleDateString(undefined, {
          weekday: "long",
        });
        return `${dayName}, ${dateStr}`;
      });

      const datesStr =
        formattedDates.length > 0
          ? formattedDates.join("<br>")
          : '<span style="color:#9ca3af; font-style:italic;">None</span>';

      tr.innerHTML = `
                <td>${index + 1}</td>
                <td>${s.rollNo || "N/A"}</td>
                <td>${s.name}</td>
                <td style="font-weight:bold; color: ${
                  studentStats.totalAbsent > 0
                    ? "var(--danger-color)"
                    : "inherit"
                }">
                    ${studentStats.totalAbsent}
                </td>
                <td>${datesStr}</td>
            `;
      this.reportsListEl.appendChild(tr);
    });
  }

  showToast(msg, type = "success") {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = msg;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new UIController();
});
