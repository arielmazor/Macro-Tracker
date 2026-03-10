import { format } from 'date-fns';

export const getTodayStr = () => format(new Date(), 'yyyy-MM-dd');

