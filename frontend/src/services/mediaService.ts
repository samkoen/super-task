import api from "./api";

export const mediaService = {
  isReady: async (src: string): Promise<boolean> => {
    const { data } = await api.get<{ ready: boolean }>("/media/ready", { params: { src } });
    return Boolean(data.ready);
  },
};
