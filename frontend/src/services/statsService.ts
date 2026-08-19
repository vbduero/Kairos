const API_URL = 'http://localhost:8000/api/v1';

export const statsService = {
  logSign: async (sign: string) => {
    try {
      await fetch(`${API_URL}/stats/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sign })
      });
    } catch (error) {
      console.error('Error logging sign:', error);
    }
  },

  logTime: async (durationSeconds: number) => {
    try {
      await fetch(`${API_URL}/stats/time`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration_seconds: durationSeconds })
      });
    } catch (error) {
      console.error('Error logging time:', error);
    }
  },

  logPhrase: async (phrase: string, timeTakenSeconds: number) => {
    try {
      const words = phrase.trim().split(/\s+/);
      const wordCount = phrase.trim() === '' ? 0 : words.length;
      await fetch(`${API_URL}/stats/phrase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phrase_text: phrase, word_count: wordCount, time_taken_seconds: timeTakenSeconds })
      });
    } catch (error) {
      console.error('Error logging phrase:', error);
    }
  },

  logTeacherResponse: async (text: string) => {
    try {
      if (!text.trim()) return;
      await fetch(`${API_URL}/stats/teacher_response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response_text: text.trim() })
      });
    } catch (error) {
      console.error('Error logging teacher response:', error);
    }
  },

  logFailedAttempt: async (sign: string, confidence: number) => {
    try {
      await fetch(`${API_URL}/stats/failed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intended_sign: sign, confidence: Math.round(confidence * 100) })
      });
    } catch (error) {
      console.error('Error logging failed attempt:', error);
    }
  },

  getSummary: async () => {
    try {
      const response = await fetch(`${API_URL}/stats/summary`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching stats summary:', error);
      return null;
    }
  },

  getAiSuggestion: async () => {
    try {
      const response = await fetch(`${API_URL}/stats/ai-suggestions`);
      const data = await response.json();
      return data.suggestion;
    } catch (error) {
      console.error('Error fetching AI suggestions:', error);
      return null;
    }
  },
};
