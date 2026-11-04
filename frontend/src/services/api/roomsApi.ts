import { request } from './client';

export const roomsApi = {
  getRooms: async (type?: string) => {
    try {
      const q = type ? `?type=${encodeURIComponent(type)}` : '';
      const res = await request<any>(`/rooms${q}`);
      return Array.isArray(res) ? res : res?.rooms || [];
    } catch {
      return [];
    }
  },
  getApprovedExamHalls: () => request<any[]>('/rooms/halls/approved'),
  createRoom: (data: any) => request<any>('/rooms', { method: 'POST', body: JSON.stringify(data) }),
  updateRoomLayout: (roomId: string, layout: any) =>
    request<any>(`/rooms/${roomId}/layout`, { method: 'PUT', body: JSON.stringify(layout) }),
};
