const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5001/api";

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
};

export type LoginResponse = {
  accessToken?: string;
  token?: string;
  refreshToken?: string;
  sessionId?: string;
  user?: {
    id: number;
    name: string;
    email: string;
  };
};

export type RegisterResponse = LoginResponse & {
  message?: string;
};

const parseErrorMessage = async (res: Response): Promise<string> => {
  try {
    const data = await res.json();
    return data.message || "An error occurred";
  } catch {
    return res.statusText || "An error occurred";
  }
};

export const loginUser = async (
  payload: LoginPayload,
): Promise<LoginResponse> => {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(await parseErrorMessage(res));
  }

  return (await res.json()) as LoginResponse;
};

export const registerUser = async (
  payload: RegisterPayload,
): Promise<RegisterResponse> => {
  const res = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(await parseErrorMessage(res));
  }

  return (await res.json()) as RegisterResponse;
};

export const logoutUser = async (refreshToken: string): Promise<void> => {
  const token =
    localStorage.getItem("accessToken") || localStorage.getItem("token");

  await fetch(`${API_BASE_URL}/auth/logout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({ refreshToken: refreshToken || token }),
  }).catch(() => {
    // Ignore errors on logout
  });
};

export const getDashboardData = async (): Promise<any> => {
  const token =
    localStorage.getItem("accessToken") || localStorage.getItem("token");

  if (!token) {
    throw new Error("No authentication token found");
  }

  const res = await fetch(`${API_BASE_URL}/dashboard`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errorMessage = await parseErrorMessage(res);
    throw new Error(
      `Failed to fetch dashboard (${res.status}): ${errorMessage}`,
    );
  }

  return (await res.json()) as any;
};
