function semakTugasanGC(namaKelas, namaTugasan) {
  try {
    var response = Classroom.Courses.list({ courseStates: ['ACTIVE'] });
    var courses = response.courses || [];
    var courseId = null;
    
    for (var i = 0; i < courses.length; i++) {
      if (courses[i].name.toLowerCase() === namaKelas.toLowerCase()) {
        courseId = courses[i].id;
        break;
      }
    }
    
    if (!courseId) {
      return { success: false, message: "Kelas tidak dijumpai: " + namaKelas };
    }
    
    var cwResponse = Classroom.Courses.CourseWork.list(courseId);
    var courseWorks = cwResponse.courseWork || [];
    
    var matchedCw = null;
    var isWayground = false;
    
    // Smart Search: Check materials for Wayground / Quizizz
    for (var j = 0; j < courseWorks.length; j++) {
      var cw = courseWorks[j];
      if (cw.materials) {
        for (var k = 0; k < cw.materials.length; k++) {
          var m = cw.materials[k];
          if (m.link && m.link.url && (m.link.url.toLowerCase().indexOf('wayground') > -1 || m.link.url.toLowerCase().indexOf('quizizz') > -1)) {
            matchedCw = cw;
            isWayground = true;
            break;
          }
        }
      }
      if (isWayground) break;
    }
    
    if (!matchedCw) {
      for (var j = 0; j < courseWorks.length; j++) {
        if (courseWorks[j].title.toLowerCase() === namaTugasan.toLowerCase()) {
          matchedCw = courseWorks[j];
          isWayground = false;
          break;
        }
      }
    }
    
    if (matchedCw) {
      return {
        success: true,
        courseId: courseId,
        courseWorkId: matchedCw.id,
        namaTugasan: matchedCw.title,
        isWayground: isWayground
      };
    } else {
      return { success: false, message: "Tiada tugasan dijumpai." };
    }
    
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

function simpanDanSyncWayground(data) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Data Wayground");
    if (!sheet) {
      sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet("Data Wayground");
      sheet.appendRow(["Timestamp", "Nama Kelas", "Nama Tugasan", "Nama Pelajar", "Markah"]);
    }
    
    var timestamp = new Date();
    var courseId = data.courseId;
    var courseWorkId = data.courseWorkId;
    var peserta = data.peserta || [];
    var namaKelas = data.namaKelas;
    var namaTugasan = data.namaTugasan;
    
    var studentsResponse = Classroom.Courses.Students.list(courseId);
    var students = studentsResponse.students || [];
    
    var subResponse = Classroom.Courses.CourseWork.StudentSubmissions.list(courseId, courseWorkId);
    var submissions = subResponse.studentSubmissions || [];
    
    var syncCount = 0;
    
    for (var i = 0; i < peserta.length; i++) {
      var p = peserta[i];
      var pName = p.nama.toLowerCase();
      var markah = parseFloat(p.markah);
      
      // Simpan ke sheet
      sheet.appendRow([timestamp, namaKelas, namaTugasan, p.nama, markah]);
      
      // Cari padanan nama di Classroom
      var matchedUserId = null;
      for (var j = 0; j < students.length; j++) {
        var fullName = (students[j].profile.name.fullName || '').toLowerCase();
        if (fullName === pName || fullName.indexOf(pName) > -1 || pName.indexOf(fullName) > -1) {
          matchedUserId = students[j].userId;
          break;
        }
      }
      
      if (matchedUserId) {
        var subId = null;
        for (var k = 0; k < submissions.length; k++) {
          if (submissions[k].userId === matchedUserId) {
            subId = submissions[k].id;
            break;
          }
        }
        
        if (subId) {
          var updateData = {
            draftGrade: markah,
            assignedGrade: markah
          };
          Classroom.Courses.CourseWork.StudentSubmissions.patch(updateData, courseId, courseWorkId, subId, {
            updateMask: 'draftGrade,assignedGrade'
          });
          syncCount++;
        }
      }
    }
    
    return { success: true, count: syncCount };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}
