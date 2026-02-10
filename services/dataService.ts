
import { createClient } from '@supabase/supabase-js';
import { Report, Comment } from '../types';

const SUPABASE_URL = 'https://hsswljqeefeapyxntydu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhzc3dsanFlZWZlYXB5eG50eWR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NzQ1NzEsImV4cCI6MjA4NTA1MDU3MX0._tfDM2hmkQ0QPdI9wgMzBXynOhdMQcdc8nl8nVzhsF4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const sharedDataService = {
  isConfigured: () => {
    return !!SUPABASE_URL && !SUPABASE_URL.includes('YOUR_SUPABASE');
  },

  getProjectInfo: () => ({
    projectId: SUPABASE_URL.split('//')[1]?.split('.')[0] || 'Unconfigured',
    isConfigured: !!SUPABASE_URL && !SUPABASE_URL.includes('YOUR_SUPABASE')
  }),

  // Maps database snake_case to frontend camelCase
  mapReportFromDb(dbReport: any): Report {
    return {
      id: dbReport.id,
      timestamp: Number(dbReport.timestamp),
      type: dbReport.type,
      description: dbReport.description,
      location: dbReport.location,
      mediaUrl: dbReport.media_url,
      mediaType: dbReport.media_type,
      severity: dbReport.severity,
      isVerified: dbReport.is_verified,
      isAnonymous: dbReport.is_anonymous,
      categoryAnalysis: dbReport.category_analysis,
      comments: [] // Loaded separately
    };
  },

  async getReports(): Promise<Report[]> {
    if (!this.isConfigured()) return [];
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('timestamp', { ascending: false });

      if (error) throw error;
      return (data || []).map(this.mapReportFromDb);
    } catch (err) {
      console.error("Supabase Fetch Error:", err);
      return [];
    }
  },

  async createReport(report: Report, mediaFile?: File | null): Promise<boolean> {
    if (!this.isConfigured()) return false;
    try {
      let finalMediaUrl = report.mediaUrl;

      // Handle File Upload if present
      if (mediaFile) {
        const fileExt = mediaFile.name.split('.').pop();
        const fileName = `${report.id}_${Date.now()}.${fileExt}`;
        const filePath = `uploads/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('evidence')
          .upload(filePath, mediaFile);

        if (uploadError) {
          console.error("Storage Upload Error:", uploadError);
          // We continue to save the report without the image if upload fails, 
          // or you could return false here to block it.
        } else {
          const { data } = supabase.storage
            .from('evidence')
            .getPublicUrl(filePath);
          
          finalMediaUrl = data.publicUrl;
        }
      }

      // EXPLICIT MAPPING: Frontend keys -> DB snake_case keys
      const payload = {
        id: report.id,
        timestamp: report.timestamp,
        type: report.type,
        description: report.description,
        location: {
          lat: report.location.lat,
          lng: report.location.lng,
          address: report.location.address
        },
        media_url: finalMediaUrl || null,
        media_type: report.mediaType || null,
        severity: report.severity,
        is_verified: report.isVerified || false,
        is_anonymous: report.isAnonymous,
        category_analysis: report.categoryAnalysis || null
      };

      const { error } = await supabase
        .from('reports')
        .insert([payload]);

      if (error) {
        console.error("Supabase Insert Failure:", error.message, error.details);
        return false;
      }
      return true;
    } catch (err) {
      console.error("Supabase: Critical error creating report.", err);
      return false;
    }
  },

  async getComments(reportId: string): Promise<Comment[]> {
    if (!this.isConfigured()) return [];
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('report_id', reportId)
        .order('timestamp', { ascending: true });

      if (error) throw error;
      
      return (data || []).map(c => ({
        id: c.id,
        text: c.text,
        timestamp: Number(c.timestamp),
        isAnonymous: c.is_anonymous
      }));
    } catch (err) {
      console.error("Supabase: Failed to fetch comments.", err);
      return [];
    }
  },

  async addComment(reportId: string, comment: Comment): Promise<boolean> {
    if (!this.isConfigured()) return false;
    try {
      const payload = {
        id: comment.id,
        report_id: reportId,
        text: comment.text,
        timestamp: comment.timestamp,
        is_anonymous: comment.isAnonymous
      };
      
      const { error } = await supabase
        .from('comments')
        .insert([payload]);

      if (error) {
        console.error("Supabase Comment Error:", error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.error("Supabase: Failed to save comment.", err);
      return false;
    }
  },

  subscribeToReports(callback: (payload: { new: any }) => void) {
    if (!this.isConfigured()) return null;
    
    console.log('Realtime: Connecting to Satellite Grid...');
    
    const channel = supabase
      .channel('reports-realtime')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'reports' 
      }, (payload) => {
        console.log('Realtime Broadcast Received:', payload.new.id);
        callback({ new: this.mapReportFromDb(payload.new) });
      })
      .subscribe((status) => {
        console.log('Link Status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  },

  subscribeToComments(reportId: string, callback: (payload: { new: any }) => void) {
    if (!this.isConfigured()) return null;

    const channel = supabase
      .channel(`comments-${reportId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'comments',
        filter: `report_id=eq.${reportId}`
      }, (payload) => {
        const c = payload.new;
        callback({ 
          new: {
            id: c.id,
            text: c.text,
            timestamp: Number(c.timestamp),
            isAnonymous: c.is_anonymous
          }
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
};
