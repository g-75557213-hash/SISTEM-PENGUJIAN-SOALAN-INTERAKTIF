export interface GCClass {
  id: string;
  name: string;
  section?: string;
}

export interface GCAssignment {
  id: string;
  courseId: string;
  title: string;
  description: string;
  state: string;
  alternateLink: string;
  materials?: any[];
}

export async function getClasses(token: string): Promise<GCClass[]> {
  const res = await fetch('https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE', {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('UNAUTHENTICATED');
    }
    throw new Error('Failed to fetch classes');
  }
  const data = await res.json();
  return data.courses || [];
}

export async function createAssignment(
  token: string, 
  courseId: string, 
  title: string, 
  description: string, 
  linkUrl: string,
  options?: {
    maxPoints?: number;
    dueDate?: { year: number, month: number, day: number };
    dueTime?: { hours: number, minutes: number, seconds: number };
  }
): Promise<GCAssignment> {
  const body: any = {
    title,
    description,
    state: 'PUBLISHED',
    workType: 'ASSIGNMENT',
    materials: [
      {
        link: {
          url: linkUrl
        }
      }
    ]
  };

  if (options?.maxPoints !== undefined) {
    body.maxPoints = options.maxPoints;
  }
  if (options?.dueDate) {
    body.dueDate = options.dueDate;
  }
  if (options?.dueTime) {
    body.dueTime = options.dueTime;
  }

  const res = await fetch(`https://classroom.googleapis.com/v1/courses/${courseId}/courseWork`, {
    method: 'POST',
    headers: { 
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) { if (res.status === 401) throw new Error('UNAUTHENTICATED'); throw new Error('Failed to create assignment'); }
  return await res.json();
}

export async function getAssignments(token: string, courseId: string): Promise<GCAssignment[]> {
  const res = await fetch(`https://classroom.googleapis.com/v1/courses/${courseId}/courseWork`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) { if (res.status === 401) throw new Error('UNAUTHENTICATED'); throw new Error('Failed to fetch assignments'); }
  const data = await res.json();
  return data.courseWork || [];
}

export async function getStudentSubmissions(token: string, courseId: string, courseWorkId: string) {
  const res = await fetch(`https://classroom.googleapis.com/v1/courses/${courseId}/courseWork/${courseWorkId}/studentSubmissions`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) { if (res.status === 401) throw new Error('UNAUTHENTICATED'); throw new Error('Failed to fetch submissions'); }
  const data = await res.json();
  return data.studentSubmissions || [];
}

export async function getStudents(token: string, courseId: string) {
  const res = await fetch(`https://classroom.googleapis.com/v1/courses/${courseId}/students`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) { if (res.status === 401) throw new Error('UNAUTHENTICATED'); throw new Error('Failed to fetch students'); }
  const data = await res.json();
  return data.students || [];
}

export async function getTeachers(token: string, courseId: string) {
  const res = await fetch(`https://classroom.googleapis.com/v1/courses/${courseId}/teachers`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) { if (res.status === 401) throw new Error('UNAUTHENTICATED'); throw new Error('Failed to fetch teachers'); }
  const data = await res.json();
  return data.teachers || [];
}

export async function deleteAssignment(token: string, courseId: string, courseWorkId: string) {
  const res = await fetch(`https://classroom.googleapis.com/v1/courses/${courseId}/courseWork/${courseWorkId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) { if (res.status === 401) throw new Error('UNAUTHENTICATED'); throw new Error('Failed to delete assignment'); }
}

export async function patchStudentSubmissionGrade(
  token: string,
  courseId: string,
  courseWorkId: string,
  submissionId: string,
  grade: number
) {
  const res = await fetch(`https://classroom.googleapis.com/v1/courses/${courseId}/courseWork/${courseWorkId}/studentSubmissions/${submissionId}?updateMask=draftGrade`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      draftGrade: grade
    })
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to update grade: ${errText}`);
  }
  return await res.json();
}

export async function returnStudentSubmission(
  token: string,
  courseId: string,
  courseWorkId: string,
  submissionId: string
) {
  const res = await fetch(`https://classroom.googleapis.com/v1/courses/${courseId}/courseWork/${courseWorkId}/studentSubmissions/${submissionId}:return`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error(`Failed to return submission: ${errText}`);
  }
}
