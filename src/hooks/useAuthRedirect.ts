import { useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/utils/supabaseClient";

const useAuthRedirect = () => {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
      }
    };

    checkAuth();
  }, [router, supabase]);

  return null;
};

export default useAuthRedirect;
