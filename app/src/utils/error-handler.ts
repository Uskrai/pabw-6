import { AxiosError } from "axios";
import { ToastContainer, toast } from 'react-toastify';


export function handleError(fun: (...args: any) => Promise<any>) {

  return async (...args: any[]) => {
    try {

    let result = await fun.apply(null, args as any);
    } catch (e) {
      if (e instanceof AxiosError) {
        toast(e.response?.data?.message)
      }
    }

  }
}
