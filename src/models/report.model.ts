export interface Report {
  report_id: string;
  title: string;
  filename: string;
  file_path: string;
  file_size?: number;
  format: string;
  report_type: 'sentiment' | 'feedback' | 'performance' | 'services';
  office_id?: string;
  user_id: string;
  start_date?: string;
  end_date?: string;
  status: 'generating' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
  office_name?: string; // Joined from offices table
  user_name?: string;   // Joined from users table
}

export interface CreateReportData {
  title: string;
  filename: string;
  file_path: string;
  file_size?: number;
  format: string;
  report_type: 'sentiment' | 'feedback' | 'performance' | 'services';
  office_id?: string;
  user_id: string;
  start_date?: string;
  end_date?: string;
  status?: 'generating' | 'completed' | 'failed';
}

export interface UpdateReportData {
  title?: string;
  file_size?: number;
  status?: 'generating' | 'completed' | 'failed';
  updated_at?: string;
}
