const base = import.meta.env.VITE_API_URL || '/api';

async function call<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${base}/programmes${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch { throw new Error('Cannot reach the FitKit API.'); }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`);
  return data as T;
}

export interface Prescription {
  prescription_id?: number;
  exercise_id: number;
  exercise_name?: string;
  exercise_media_url?: string | null;
  position?: number;
  sets: number;
  tracking_type: 'reps' | 'time' | 'distance';
  rep_min?: number | null;
  rep_max?: number | null;
  target_load_kg?: number | null;
  duration_seconds?: number | null;
  distance_meters?: number | null;
  rpe?: number | null;
  rest_seconds: number;
  tempo?: string;
  is_warmup?: boolean;
  notes?: string;
}
export interface ProgrammeDay {
  day_number: number;
  day_type: 'Training' | 'Rest';
  title: string;
  notes: string;
  session_id?: number | null;
  session_title: string;
  estimated_minutes: number;
  exercises: Prescription[];
}
export interface ProgrammeWeek {
  week_number: number;
  title: string;
  is_deload: boolean;
  progression_notes: string;
  days: ProgrammeDay[];
}
export interface Programme {
  programme_id: number;
  version_id: number;
  version_number: number;
  status: 'Draft' | 'Published' | 'Archived';
  archived_at?: string | null;
  admin_id: number;
  name: string;
  description: string;
  cover_url?: string | null;
  goal: string;
  difficulty: string;
  duration_weeks: number;
  days_per_week: number;
  session_minutes: number;
  environment: string;
  equipment: string;
  audience: string;
  prerequisites: string;
  restrictions: string;
  target_muscles: string[];
  tags: string[];
  visibility: string;
  creator_name: string;
  creator_photo_url?: string | null;
  weeks: ProgrammeWeek[];
}
export interface Enrollment {
  enrollment_id: number;
  status: string;
  started_at: string;
  version_id: number;
  version_number: number;
  programme_id: number;
  name: string;
  duration_weeks: number;
  total_sessions: number;
  completed_sessions: number;
}

export const listProgrammes = (mine = false) => call<Programme[]>(mine ? '?mine=true' : '');
export const getProgramme = (id: number, version?: number) => call<Programme>(`/${id}${version ? `?version=${version}` : ''}`);
export const createProgramme = (details: unknown) => call<Programme>('', 'POST', details);
export const updateProgramme = (id: number, details: unknown) => call<Programme>(`/${id}`, 'PUT', details);
export const saveProgrammeStructure = (id: number, weeks: ProgrammeWeek[]) => call<Programme>(`/${id}/structure`, 'PUT', { weeks });
export const publishProgramme = (id: number) => call<Programme>(`/${id}/publish`, 'POST');
export const deleteProgramme = (id: number) => call<{message:string}>(`/${id}`, 'DELETE');
export const newProgrammeVersion = (id: number) => call<Programme>(`/${id}/new-version`, 'POST');
export const deleteProgrammeDraft = (id: number) => call<{ message: string; programme_deleted: boolean }>(`/${id}/draft`, 'DELETE');
export const enrollProgramme = (id: number) => call<any>(`/${id}/enroll`, 'POST');
export const myEnrollments = () => call<Enrollment[]>('/enrollments');
export const setEnrollmentStatus = (id: number, status: 'Active' | 'Paused') => call<Enrollment>(`/enrollments/${id}`, 'PATCH', { status });
export const startProgrammeSession = (enrollmentId: number, sessionId: number) => call<any>(`/enrollments/${enrollmentId}/sessions/${sessionId}`, 'POST');
export const enrollmentLogs = (id: number) => call<any[]>(`/enrollments/${id}/logs`);
export const saveWorkoutSet = (logId: number, prescriptionId: number, setNumber: number, values: unknown) => call<any>(`/logs/${logId}/sets/${prescriptionId}/${setNumber}`, 'PUT', values);
export const finishProgrammeSession = (logId: number, notes: string) => call<any>(`/logs/${logId}/finish`, 'POST', { notes });
