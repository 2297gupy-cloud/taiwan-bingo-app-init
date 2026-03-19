const GOOGLE_API_URL = 'https://script.google.com/macros/s/AKfycbwTn1ENAOBNtbxX9jQtayBJwiHtA72_1FCpLNYyxPDudU1IF4pJ13sRFd2DevSHe4rfmQ/exec';

let cachedLatestPeriod = 0;
let lastFetchTime = 0;
const CACHE_DURATION = 25000;

export async function getLatestPeriod(): Promise<number> {
  try {
    const now = Date.now();
    if (cachedLatestPeriod > 0 && now - lastFetchTime < CACHE_DURATION) {
      return cachedLatestPeriod;
    }

    const response = await fetch(`${GOOGLE_API_URL}?action=check`);
    const data = await response.json();

    if (data.success && data.data?.latestPeriod) {
      cachedLatestPeriod = data.data.latestPeriod;
      lastFetchTime = now;
      return cachedLatestPeriod;
    }
    return 0;
  } catch (error) {
    console.error('[Google API] Error:', error);
    return cachedLatestPeriod;
  }
}

export async function getLatestDraws(n: number = 3): Promise<any[]> {
  try {
    const response = await fetch(`${GOOGLE_API_URL}?action=latest&n=${Math.min(n, 20)}`);
    const data = await response.json();

    if (data.success && Array.isArray(data.data)) {
      return data.data.map((item: any) => ({
        period: String(item.period),
        date: item.date,
        time: item.time,
        numbers: Array.isArray(item.numbers) ? item.numbers : String(item.numbers).split(' '),
        superNum: item.superNum || '',
        size: item.size || '',
        oe: item.oe || '',
        timestamp: new Date(item.date + ' ' + item.time).getTime(),
      }));
    }
    return [];
  } catch (error) {
    console.error('[Google API] Error:', error);
    return [];
  }
}

export async function getDrawsByDate(dateStr: string): Promise<any[]> {
  try {
    const response = await fetch(`${GOOGLE_API_URL}?action=date&date=${dateStr}`);
    const data = await response.json();

    if (data.success && Array.isArray(data.data)) {
      return data.data.map((item: any) => ({
        period: String(item.period),
        date: item.date,
        time: item.time,
        numbers: Array.isArray(item.numbers) ? item.numbers : String(item.numbers).split(' '),
        superNum: item.superNum || '',
        size: item.size || '',
        oe: item.oe || '',
        timestamp: new Date(item.date + ' ' + item.time).getTime(),
      }));
    }
    return [];
  } catch (error) {
    console.error('[Google API] Error:', error);
    return [];
  }
}

export async function getDrawsByRange(fromDate: string, toDate: string): Promise<any[]> {
  try {
    const response = await fetch(`${GOOGLE_API_URL}?action=range&from=${fromDate}&to=${toDate}`);
    const data = await response.json();

    if (data.success && Array.isArray(data.data)) {
      return data.data.map((item: any) => ({
        period: String(item.period),
        date: item.date,
        time: item.time,
        numbers: Array.isArray(item.numbers) ? item.numbers : String(item.numbers).split(' '),
        superNum: item.superNum || '',
        size: item.size || '',
        oe: item.oe || '',
        timestamp: new Date(item.date + ' ' + item.time).getTime(),
      }));
    }
    return [];
  } catch (error) {
    console.error('[Google API] Error:', error);
    return [];
  }
}

export async function getSummary(): Promise<any> {
  try {
    const response = await fetch(`${GOOGLE_API_URL}?action=summary`);
    const data = await response.json();

    if (data.success) {
      return data.data || {};
    }
    return {};
  } catch (error) {
    console.error('[Google API] Error:', error);
    return {};
  }
}

export async function getDrawByPeriod(period: string): Promise<any | null> {
  try {
    const response = await fetch(`${GOOGLE_API_URL}?action=period&id=${period}`);
    const data = await response.json();

    if (data.success && data.data) {
      const item = data.data;
      return {
        period: String(item.period),
        date: item.date,
        time: item.time,
        numbers: Array.isArray(item.numbers) ? item.numbers : String(item.numbers).split(' '),
        superNum: item.superNum || '',
        size: item.size || '',
        oe: item.oe || '',
        timestamp: new Date(item.date + ' ' + item.time).getTime(),
      };
    }
    return null;
  } catch (error) {
    console.error('[Google API] Error:', error);
    return null;
  }
}
