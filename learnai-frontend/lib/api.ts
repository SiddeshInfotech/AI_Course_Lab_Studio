const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5001/api";

interface ApiError {
  message: string;
  [key: string]: unknown;
}

const parseResponse = async <T>(response: Response): Promise<T> => {
  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || `HTTP error ${response.status}`);
    }
    return data;
  }
  if (!response.ok) {
    throw new Error(`HTTP error ${response.status}`);
  }
  return {} as T;
};

const getAuthHeaders = (): HeadersInit => {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }
  return headers;
};

export const api = {
  auth: {
    login: async (username: string, password: string) => {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      return parseResponse<{
        token: string;
        user: {
          id: number;
          name: string;
          username: string;
          email: string;
          isAdmin: boolean;
        };
      }>(response);
    },

    register: async (
      name: string,
      username: string,
      email: string,
      password: string,
    ) => {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, username, email, password }),
      });
      return parseResponse<{
        token: string;
        user: {
          id: number;
          name: string;
          username: string;
          email: string;
          isAdmin: boolean;
        };
      }>(response);
    },

    me: async () => {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: getAuthHeaders(),
      });
      return parseResponse<{
        user: {
          id: number;
          name: string;
          username: string;
          email: string;
          isAdmin: boolean;
        };
      }>(response);
    },

    logout: async () => {
      const response = await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      return parseResponse<{ message: string }>(response);
    },
  },

  courses: {
    list: async () => {
      const response = await fetch(`${API_BASE_URL}/courses`, {
        headers: getAuthHeaders(),
      });
      return parseResponse<
        Array<{
          id: number;
          title: string;
          description: string;
          category: string;
          level: string;
          imageUrl: string | null;
          instructor: string;
          duration: string;
        }>
      >(response);
    },

    get: async (id: number) => {
      const response = await fetch(`${API_BASE_URL}/courses/${id}`, {
        headers: getAuthHeaders(),
      });
      return parseResponse<{
        id: number;
        title: string;
        description: string;
        category: string;
        level: string;
        imageUrl: string | null;
        instructor: string;
        duration: string;
      }>(response);
    },

    getEnrolled: async () => {
      const response = await fetch(`${API_BASE_URL}/courses/enrolled`, {
        headers: getAuthHeaders(),
      });
      return parseResponse<
        Array<{
          id: number;
          title: string;
          description: string;
          category: string;
          level: string;
          imageUrl: string | null;
          instructor: string;
          duration: string;
        }>
      >(response);
    },

    enroll: async (courseId: number) => {
      const response = await fetch(
        `${API_BASE_URL}/courses/${courseId}/enroll`,
        {
          method: "POST",
          headers: getAuthHeaders(),
        },
      );
      return parseResponse<{ message: string }>(response);
    },

    getLessons: async (courseId: number) => {
      const response = await fetch(
        `${API_BASE_URL}/courses/${courseId}/lessons`,
        {
          headers: getAuthHeaders(),
        },
      );
      return parseResponse<
        Array<{
          id: number;
          title: string;
          description: string | null;
          content: string | null;
          videoUrl: string | null;
          orderIndex: number;
          duration: string | null;
        }>
      >(response);
    },
  },

  dashboard: {
    getAll: async () => {
      const response = await fetch(`${API_BASE_URL}/dashboard`, {
        headers: getAuthHeaders(),
      });
      return parseResponse<{
        user: {
          id: number;
          name: string;
          username: string;
          email: string;
          created_at: string;
        };
        stats: {
          streak: number;
          modulesCompleted: number;
          modulesEnrolled: number;
          accuracy: number;
        };
        courses: Array<{
          id: number;
          title: string;
          description: string;
          category: string;
          level: string;
          imageUrl: string | null;
          instructor: string;
          duration: string;
          enrolledAt: string;
          progress?: {
            currentLessonId: number;
            totalLessons: number;
            percentComplete: number;
            completed: boolean;
            status: string;
          };
        }>;
      }>(response);
    },

    getStats: async () => {
      const response = await fetch(`${API_BASE_URL}/dashboard/stats`, {
        headers: getAuthHeaders(),
      });
      return parseResponse<{
        user: {
          id: number;
          name: string;
          username: string;
          email: string;
        };
        stats: {
          streak: number;
          modulesCompleted: number;
          modulesEnrolled: number;
          accuracy: number;
        };
      }>(response);
    },

    getStreak: async () => {
      const response = await fetch(`${API_BASE_URL}/dashboard/streak`, {
        headers: getAuthHeaders(),
      });
      return parseResponse<{ streak: number }>(response);
    },
  },

  learning: {
    getCurriculum: async (courseId: number) => {
      const response = await fetch(
        `${API_BASE_URL}/learning/${courseId}/curriculum`,
        {
          headers: getAuthHeaders(),
        },
      );
      return parseResponse<{
        curriculum: Array<{
          id: string;
          day: string;
          title: string;
          items: Array<{
            id: number;
            title: string;
            type: string;
            duration: string | null;
            completed: boolean;
            active: boolean;
            description: string | null;
            content: string | null;
            videoUrl: string | null;
            objectives: string[];
            orderIndex: number;
          }>;
        }>;
        progress: {
          completed: number;
          total: number;
          percentage: number;
        };
        currentLesson: {
          id: number;
          title: string;
          type: string;
          duration: string | null;
          description: string | null;
          content: string | null;
          videoUrl: string | null;
          objectives: string[];
          orderIndex: number;
        } | null;
      }>(response);
    },

    getLesson: async (lessonId: number) => {
      const response = await fetch(
        `${API_BASE_URL}/learning/lesson/${lessonId}`,
        {
          headers: getAuthHeaders(),
        },
      );
      return parseResponse<{
        id: number;
        title: string;
        description: string | null;
        content: string | null;
        videoUrl: string | null;
        duration: string | null;
        section: string | null;
        sectionTitle: string | null;
        type: string;
        objectives: string[];
        completed: boolean;
        orderIndex: number;
        course: {
          id: number;
          title: string;
        };
      }>(response);
    },

    completeLesson: async (lessonId: number) => {
      const response = await fetch(
        `${API_BASE_URL}/learning/lesson/${lessonId}/complete`,
        {
          method: "POST",
          headers: getAuthHeaders(),
        },
      );
      return parseResponse<{
        message: string;
        lessonProgress: {
          id: number;
          userId: number;
          lessonId: number;
          courseId: number;
          completed: boolean;
          completedAt: string | null;
        };
      }>(response);
    },

    setCurrentLesson: async (courseId: number, lessonOrderIndex: number) => {
      const response = await fetch(
        `${API_BASE_URL}/learning/${courseId}/current-lesson`,
        {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify({ lessonOrderIndex }),
        },
      );
      return parseResponse<{
        message: string;
        courseProgress: {
          id: number;
          userId: number;
          courseId: number;
          currentLessonId: number;
          completed: boolean;
          lastAccessedAt: string;
        };
      }>(response);
    },
  },

  admin: {
    dashboard: async () => {
      const response = await fetch(`${API_BASE_URL}/admin/dashboard`, {
        headers: getAuthHeaders(),
      });
      return parseResponse<{
        stats: {
          totalUsers: number;
          totalCourses: number;
          totalLessons: number;
          totalEnrollments: number;
        };
        recentUsers: Array<{
          id: number;
          name: string;
          username: string;
          email: string;
          created_at: string;
        }>;
        recentEnrollments: Array<{
          enrolledAt: string;
          user: { name: string; username: string; email: string };
          course: { title: string };
        }>;
      }>(response);
    },

    users: async () => {
      const response = await fetch(`${API_BASE_URL}/admin/users`, {
        headers: getAuthHeaders(),
      });
      return parseResponse<
        Array<{
          id: number;
          name: string;
          username: string;
          email: string;
          isAdmin: boolean;
          created_at: string;
        }>
      >(response);
    },

    courses: async () => {
      const response = await fetch(`${API_BASE_URL}/admin/courses`, {
        headers: getAuthHeaders(),
      });
      return parseResponse<
        Array<{
          id: number;
          title: string;
          description: string;
          category: string;
          level: string;
          imageUrl: string | null;
          instructor: string;
          duration: string;
        }>
      >(response);
    },

    createCourse: async (course: {
      title: string;
      description: string;
      category: string;
      level: string;
      instructor: string;
      duration: string;
      imageUrl?: string;
    }) => {
      const response = await fetch(`${API_BASE_URL}/admin/courses`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(course),
      });
      return parseResponse<{
        id: number;
        title: string;
        description: string;
        category: string;
        level: string;
        instructor: string;
        duration: string;
      }>(response);
    },

    createUser: async (user: {
      name: string;
      username: string;
      email: string;
      password: string;
      isAdmin?: boolean;
    }) => {
      const response = await fetch(`${API_BASE_URL}/admin/users`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(user),
      });
      return parseResponse<{
        id: number;
        name: string;
        username: string;
        email: string;
        isAdmin: boolean;
      }>(response);
    },
  },
};

export type { ApiError };
