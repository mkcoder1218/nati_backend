export interface ScheduledReport {
  scheduled_report_id: string;
  title: string;
  report_type: 'sentiment' | 'feedback' | 'performance' | 'services';
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  office_id?: string;
  user_id: string;
  recipients: string[]; // Array of email addresses
  next_run_date: string;
  last_run_date?: string;
  status: 'active' | 'paused' | 'inactive';
  notes?: string;
  created_at: string;
  updated_at: string;
  office_name?: string; // Joined from offices table
  user_name?: string;   // Joined from users table
}

export interface CreateScheduledReportData {
  title: string;
  report_type: 'sentiment' | 'feedback' | 'performance' | 'services';
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  office_id?: string;
  user_id: string;
  recipients: string[];
  next_run_date: string;
  status?: 'active' | 'paused' | 'inactive';
  notes?: string;
}

export interface UpdateScheduledReportData {
  title?: string;
  report_type?: 'sentiment' | 'feedback' | 'performance' | 'services';
  frequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  office_id?: string;
  recipients?: string[];
  next_run_date?: string;
  last_run_date?: string;
  status?: 'active' | 'paused' | 'inactive';
  notes?: string;
  updated_at?: string;
}
