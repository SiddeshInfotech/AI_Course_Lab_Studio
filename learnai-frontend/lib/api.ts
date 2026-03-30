const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5001/api";

interface ApiError {
  message: string;
  [key: string]: unknown;
}

class ApiResponseError extends Error {
  status: number;
  payload?: unknown;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = "ApiResponseError";
    this.status = status;
    this.payload = payload;
  }
}

const getPayloadMessage = (payload: unknown, fallback: string): string => {
  if (typeof payload === "string" && payload.trim()) return payload.trim();
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message.trim();
  }
  return fallback;
};

const getErrorCode = (payload: unknown): string | undefined => {
  if (payload && typeof payload === "object" && "error" in payload) {
    const error = (payload as { error?: unknown }).error;
    if (typeof error === "string") return error;
  }
  return undefined;
};

const clearClientAuthOnUnauthorized = (status: number, errorCode?: string) => {
  if (status !== 401 || typeof window === "undefined") return;
  // Only clear on SESSION_EXPIRED or other critical errors
  if (
    errorCode === "SESSION_EXPIRED" ||
    errorCode === "INVALID_TOKEN_FORMAT" ||
    !errorCode // Fallback to clear if no error code provided
  ) {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    if (errorCode) {
      console.warn(`🔴 Auth cleared due to ${errorCode}`);
    }
  }
};

async function parseResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type");
  const fallback = `HTTP error ${response.status}`;

  if (contentType?.includes("application/json")) {
    let data: unknown = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      const message = getPayloadMessage(data, fallback);
      const errorCode = getErrorCode(data);
      clearClientAuthOnUnauthorized(response.status, errorCode);

      // Log token-related errors for debugging
      if (response.status === 401 && errorCode) {
        console.warn(`Authentication error: ${message} (Error: ${errorCode})`);
      }

      throw new ApiResponseError(message, response.status, data);
    }
    return (data ?? ({} as T)) as T;
  }

  let text = "";
  try {
    text = await response.text();
  } catch {
    text = "";
  }

  if (!response.ok) {
    const message = getPayloadMessage(text, fallback);
    clearClientAuthOnUnauthorized(response.status);
    throw new ApiResponseError(message, response.status, text);
  }

  if (text) {
    try {
      return JSON.parse(text) as T;
    } catch {
      return {} as T;
    }
  }

  return {} as T;
}

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

const getAuthOnlyHeaders = (): HeadersInit => {
  const headers: HeadersInit = {};
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
          status?: "Published" | "Draft";
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
        status?: "Published" | "Draft";
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
          status?: "Published" | "Draft";
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
          section: string | null;
          sectionTitle: string | null;
          type: string;
        }>
      >(response);
    },

    createLesson: async (
      courseId: number,
      data: {
        title: string;
        description?: string;
        content?: string;
        orderIndex: number;
        duration?: string;
        section?: string;
        sectionTitle?: string;
        type?: string;
      },
    ) => {
      const response = await fetch(
        `${API_BASE_URL}/courses/${courseId}/lessons`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        },
      );
      return parseResponse<{
        id: number;
        title: string;
        description: string | null;
        content: string | null;
        videoUrl: string | null;
        orderIndex: number;
        duration: string | null;
        section: string | null;
        sectionTitle: string | null;
        type: string;
      }>(response);
    },

    updateLesson: async (
      courseId: number,
      lessonId: number,
      data: {
        title?: string;
        description?: string;
        content?: string;
        duration?: string;
        section?: string;
        sectionTitle?: string;
        type?: string;
      },
    ) => {
      const response = await fetch(
        `${API_BASE_URL}/courses/${courseId}/lessons/${lessonId}`,
        {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        },
      );
      return parseResponse<{
        id: number;
        title: string;
      }>(response);
    },

    deleteLesson: async (courseId: number, lessonId: number) => {
      const response = await fetch(
        `${API_BASE_URL}/courses/${courseId}/lessons/${lessonId}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        },
      );
      return parseResponse<{ message: string }>(response);
    },

    uploadLessonVideo: async (
      courseId: number,
      lessonId: number,
      file: File,
      language: "english" | "hindi" | "marathi",
    ) => {
      const formData = new FormData();
      formData.append("video", file);
      formData.append("language", language);

      const response = await fetch(
        `${API_BASE_URL}/courses/${courseId}/lessons/${lessonId}/upload-video`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${
              typeof window !== "undefined" ? localStorage.getItem("token") : ""
            }`,
          },
          body: formData,
        },
      );
      return parseResponse<{
        message: string;
        lesson: {
          id: number;
          title: string;
          videoUrl: string | null;
          videoUrlEnglish: string | null;
          videoUrlHindi: string | null;
          videoUrlMarathi: string | null;
        };
        video: {
          language: string;
          url: string;
          size: number;
          fieldName: string;
        };
      }>(response);
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

  usage: {
    getStatus: async () => {
      const response = await fetch(`${API_BASE_URL}/usage/status`, {
        headers: getAuthHeaders(),
      });
      return parseResponse<{
        remainingSeconds: number;
        usedSeconds: number;
        limitSeconds: number;
        isLocked: boolean;
        remainingFormatted: string;
        usedFormatted: string;
      }>(response);
    },
    sendHeartbeat: async () => {
      const response = await fetch(`${API_BASE_URL}/usage/heartbeat`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      return parseResponse<{
        success: boolean;
        remainingSeconds: number;
        usedSeconds: number;
        limitSeconds: number;
        isLocked: boolean;
        remainingFormatted: string;
      }>(response);
    },
  },

  centers: {
    getAll: async () => {
      const response = await fetch(`${API_BASE_URL}/centers`, {
        headers: getAuthHeaders(),
      });
      return parseResponse<
        Array<{
          id: number;
          centerName: string;
          schoolName: string;
          centerCode: string;
          contactPerson: string;
          phoneNumber: string;
          email: string;
          address: string | null;
          boardOrCurriculum: string | null;
          centerAdminId: string;
          centerAdminPassword: string;
          status: string;
          createdAt: string;
          updatedAt: string;
        }>
      >(response);
    },
    create: async (data: {
      centerName: string;
      schoolName: string;
      centerCode: string;
      contactPerson: string;
      phoneNumber: string;
      email: string;
      address?: string;
      boardOrCurriculum?: string;
      centerAdminId: string;
      centerAdminPassword: string;
    }) => {
      const response = await fetch(`${API_BASE_URL}/centers`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      return parseResponse<{
        id: number;
        centerName: string;
        schoolName: string;
        centerCode: string;
        contactPerson: string;
        phoneNumber: string;
        email: string;
        address: string | null;
        boardOrCurriculum: string | null;
        centerAdminId: string;
        status: string;
      }>(response);
    },
    update: async (
      id: number,
      data: {
        centerName?: string;
        schoolName?: string;
        centerCode?: string;
        contactPerson?: string;
        phoneNumber?: string;
        email?: string;
        address?: string;
        boardOrCurriculum?: string;
        centerAdminId?: string;
        centerAdminPassword?: string;
        status?: string;
      },
    ) => {
      const response = await fetch(`${API_BASE_URL}/centers/${id}`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      return parseResponse<{
        id: number;
        centerName: string;
        schoolName: string;
        centerCode: string;
        contactPerson: string;
        phoneNumber: string;
        email: string;
        address: string | null;
        boardOrCurriculum: string | null;
        centerAdminId: string;
        status: string;
      }>(response);
    },
    delete: async (id: number) => {
      const response = await fetch(`${API_BASE_URL}/centers/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      return parseResponse<{ message: string }>(response);
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
            languages?: {
              english?: string | null;
              hindi?: string | null;
              marathi?: string | null;
            };
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
          languages?: {
            english?: string | null;
            hindi?: string | null;
            marathi?: string | null;
          };
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

    setLanguagePreference: async (
      courseId: number,
      language: "english" | "hindi" | "marathi",
    ) => {
      const response = await fetch(
        `${API_BASE_URL}/learning/${courseId}/language`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ language }),
        },
      );
      return parseResponse<{
        message: string;
        preference: {
          id: number;
          userId: number;
          courseId: number;
          language: string;
          createdAt: string;
          updatedAt: string;
        };
      }>(response);
    },

    getLanguagePreference: async (courseId: number) => {
      const response = await fetch(
        `${API_BASE_URL}/learning/${courseId}/language`,
        {
          headers: getAuthHeaders(),
        },
      );
      return parseResponse<{
        language: "english" | "hindi" | "marathi";
        preference: {
          id: number;
          userId: number;
          courseId: number;
          language: string;
          createdAt: string;
          updatedAt: string;
        } | null;
      }>(response);
    },

    getToolsForCourse: async (courseId: number) => {
      const response = await fetch(
        `${API_BASE_URL}/learning/${courseId}/tools`,
        {
          headers: getAuthHeaders(),
        },
      );
      return parseResponse<
        Array<{
          id: number;
          courseId: number;
          toolId: number;
          orderIndex: number;
          section: string;
          sectionTitle: string | null;
          description: string | null;
          demoVideoUrl: string | null;
          isPremium: boolean;
          tool: {
            id: number;
            name: string;
            description: string;
            websiteUrl: string;
            imageUrl: string | null;
            demoVideoUrl: string | null;
          };
          progress: {
            id: number;
            completed: boolean;
            completedAt: string | null;
          } | null;
        }>
      >(response);
    },

    completeToolLesson: async (toolCourseId: number) => {
      const response = await fetch(
        `${API_BASE_URL}/learning/tools/${toolCourseId}/complete`,
        {
          method: "POST",
          headers: getAuthHeaders(),
        },
      );
      return parseResponse<{
        message: string;
        progress: {
          id: number;
          userId: number;
          toolCourseId: number;
          completed: boolean;
          completedAt: string | null;
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
          rollNumber: string | null;
          dob: string | null;
          centerId: number | null;
          center: { centerName: string; centerCode: string } | null;
          _count: { enrollments: number };
        }>
      >(response);
    },

    updateUser: async (
      userId: number,
      data: {
        name?: string;
        email?: string;
        rollNumber?: string;
        dob?: string;
        centerId?: number | null;
        courseIds?: number[];
      },
    ) => {
      const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      return parseResponse<{
        message: string;
        user: {
          id: number;
          name: string;
          username: string;
          email: string;
          rollNumber: string | null;
          dob: string | null;
          centerId: number | null;
          center: { centerName: string; centerCode: string } | null;
        };
      }>(response);
    },

    courses: {
      // Get basic course list
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

      // Get course statistics for admin dashboard
      stats: async () => {
        const response = await fetch(`${API_BASE_URL}/courses/admin/stats`, {
          headers: getAuthHeaders(),
        });
        return parseResponse<{
          success: boolean;
          stats: {
            totalCourses: number;
            coursesByLevel: Record<string, number>;
            coursesByCategory: Record<string, number>;
            recentCourses: Array<{
              id: number;
              title: string;
              category: string;
              level: string;
              createdAt: string;
            }>;
          };
        }>(response);
      },

      // Get detailed course list with metadata for admin
      detailed: async (params?: {
        page?: number;
        limit?: number;
        category?: string;
        level?: string;
        search?: string;
      }) => {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.append("page", params.page.toString());
        if (params?.limit) queryParams.append("limit", params.limit.toString());
        if (params?.category) queryParams.append("category", params.category);
        if (params?.level) queryParams.append("level", params.level);
        if (params?.search) queryParams.append("search", params.search);

        const url = `${API_BASE_URL}/courses/admin/detailed${
          queryParams.toString() ? `?${queryParams}` : ""
        }`;
        const response = await fetch(url, {
          headers: getAuthHeaders(),
        });
        return parseResponse<{
          success: boolean;
          courses: Array<{
            id: number;
            title: string;
            description: string;
            category: string;
            level: string;
            imageUrl: string | null;
            instructor: string;
            duration: string;
            createdAt: string;
            updatedAt: string;
            enrollmentCount: number;
            lessonCount: number;
          }>;
          pagination: {
            currentPage: number;
            totalPages: number;
            totalCourses: number;
            coursesPerPage: number;
          };
          filters: {
            category?: string;
            level?: string;
            search?: string;
          };
        }>(response);
      },

      // Create new course
      create: async (course: {
        title: string;
        description: string;
        category: string;
        level: string;
        instructor: string;
        duration: string;
        imageUrl?: string;
      }) => {
        const response = await fetch(`${API_BASE_URL}/courses`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(course),
        });
        return parseResponse<{
          success: boolean;
          course: {
            id: number;
            title: string;
            description: string;
            category: string;
            level: string;
            instructor: string;
            duration: string;
            imageUrl: string | null;
          };
          message: string;
        }>(response);
      },

      // Update existing course
      update: async (
        id: number,
        course: {
          title?: string;
          description?: string;
          category?: string;
          level?: string;
          instructor?: string;
          duration?: string;
          imageUrl?: string;
        },
      ) => {
        const response = await fetch(`${API_BASE_URL}/courses/${id}`, {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify(course),
        });
        return parseResponse<{
          success: boolean;
          course: {
            id: number;
            title: string;
            description: string;
            category: string;
            level: string;
            instructor: string;
            duration: string;
            imageUrl: string | null;
          };
          message: string;
        }>(response);
      },

      // Update course status
      updateStatus: async (id: number, status: "Published" | "Draft") => {
        const response = await fetch(`${API_BASE_URL}/courses/${id}/status`, {
          method: "PATCH",
          headers: getAuthHeaders(),
          body: JSON.stringify({ status }),
        });
        return parseResponse<{
          success: boolean;
          message: string;
        }>(response);
      },

      // Delete course
      delete: async (id: number) => {
        const response = await fetch(`${API_BASE_URL}/courses/${id}`, {
          method: "DELETE",
          headers: getAuthHeaders(),
        });
        return parseResponse<{
          success: boolean;
          message: string;
          deletedCourse: {
            id: number;
            title: string;
          };
        }>(response);
      },

      // Get enrolled students for a specific course
      enrollments: async (courseId: number) => {
        const response = await fetch(
          `${API_BASE_URL}/courses/admin/enrollments/${courseId}`,
          {
            headers: getAuthHeaders(),
          },
        );
        return parseResponse<{
          success: boolean;
          course: {
            id: number;
            title: string;
            category: string;
            level: string;
          };
          enrollments: Array<{
            enrollmentId: number;
            enrolledAt: string;
            student: {
              id: number;
              name: string;
              username: string;
              email: string;
              rollNumber: string | null;
              dob: string | null;
              created_at: string;
            };
          }>;
          totalEnrolled: number;
        }>(response);
      },
    },

    createUser: async (user: {
      name: string;
      username: string;
      email: string;
      password: string;
      rollNumber?: string; // Roll number for students
      dob?: string; // Date of birth in YYYY-MM-DD format
      isAdmin?: boolean;
      courseIds?: number[]; // Array of course IDs for enrollment
      centerId?: number | null; // Center ID for student
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
        rollNumber: string | null;
        dob: string | null;
        isAdmin: boolean;
        enrolledCourses?: number; // Number of courses enrolled
      }>(response);
    },

    // Get detailed user information including enrolled courses
    getUserDetailed: async (id: number) => {
      const response = await fetch(
        `${API_BASE_URL}/admin/users/${id}/detailed`,
        {
          headers: getAuthHeaders(),
        },
      );
      return parseResponse<{
        id: number;
        name: string;
        username: string;
        email: string;
        rollNumber: string | null;
        dob: string | null;
        isAdmin: boolean;
        created_at: string;
        centerId: number | null;
        enrolledCourseIds: number[];
        enrolledCourses: Array<{
          id: number;
          title: string;
          category: string;
          level: string;
        }>;
      }>(response);
    },

    uploadMedia: async (data: {
      file: File;
      title?: string;
      entityType?: string;
      entityId?: number;
    }) => {
      const formData = new FormData();
      formData.append("file", data.file);
      if (data.title) formData.append("title", data.title);
      if (data.entityType) formData.append("entityType", data.entityType);
      if (typeof data.entityId === "number") {
        formData.append("entityId", String(data.entityId));
      }

      const response = await fetch(`${API_BASE_URL}/admin/upload`, {
        method: "POST",
        headers: getAuthOnlyHeaders(),
        body: formData,
      });

      return parseResponse<{
        id: number;
        filename: string;
        mimeType: string;
        size: number;
        entityType: string | null;
        entityId: number | null;
        createdAt: string;
        url: string;
      }>(response);
    },

    listMedia: async (limit = 50, offset = 0) => {
      const response = await fetch(
        `${API_BASE_URL}/admin/media?limit=${limit}&offset=${offset}`,
        {
          headers: getAuthHeaders(),
        },
      );
      return parseResponse<{
        media: Array<{
          id: number;
          filename: string;
          mimeType: string;
          size: number;
          uploadedBy: number | null;
          entityType: string | null;
          entityId: number | null;
          createdAt: string;
          url: string;
        }>;
        pagination: {
          total: number;
          limit: number;
          offset: number;
        };
        storageUsed: number;
        storageUsedFormatted: string;
      }>(response);
    },

    deleteMedia: async (id: number) => {
      const response = await fetch(`${API_BASE_URL}/admin/media/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      return parseResponse<{ message: string }>(response);
    },

    // Get signed URL for secure media access (for video streaming)
    getSignedUrl: async (mediaId: number) => {
      const response = await fetch(
        `${API_BASE_URL}/media/${mediaId}/signed-url`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            expiresIn: 60 * 60 * 1000, // 1 hour
            accessType: "view",
          }),
        },
      );
      const result = await parseResponse<{
        success: boolean;
        signedUrl: {
          url: string;
          expiresAt: string;
          token: string;
        };
        media: {
          id: number;
          filename: string;
          mimeType: string;
          size: number;
        };
      }>(response);

      return {
        url: result.signedUrl.url,
        expiresAt: result.signedUrl.expiresAt,
        mediaId: result.media.id,
      };
    },

    // Video Management (Optimized)
    videos: {
      // Get all videos with pagination and filtering (optimized with compression data)
      list: async (params?: {
        page?: number;
        limit?: number;
        courseId?: number;
        lessonId?: number;
        type?: "uploaded" | "external" | "all";
      }) => {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.append("page", params.page.toString());
        if (params?.limit) queryParams.append("limit", params.limit.toString());
        if (params?.courseId)
          queryParams.append("courseId", params.courseId.toString());
        if (params?.lessonId)
          queryParams.append("lessonId", params.lessonId.toString());
        if (params?.type) queryParams.append("type", params.type);

        const url = `${API_BASE_URL}/admin/videos${
          queryParams.toString() ? `?${queryParams}` : ""
        }`;
        const response = await fetch(url, {
          headers: getAuthHeaders(),
        });
        return parseResponse<{
          success: boolean;
          videos: Array<{
            id: number | string;
            type: "uploaded" | "external";
            title: string;
            mimeType?: string;
            size?: number;
            originalSize?: number;
            compressionRatio?: number;
            isCompressed?: boolean;
            processingTime?: number;
            url: string;
            thumbnailUrl?: string;
            createdAt: string;
            lesson?: {
              id: number;
              title: string;
              orderIndex: number;
              courseId: number;
            } | null;
            course?: {
              id: number;
              title: string;
              category: string;
              level: string;
            } | null;
          }>;
          pagination: {
            currentPage: number;
            totalPages: number;
            totalVideos: number;
            videosPerPage: number;
          };
          stats: {
            uploadedVideos: number;
            externalVideos: number;
            totalVideos: number;
            // Enhanced storage statistics
            storageUsed: number;
            originalStorageSize: number;
            spaceSaved: number;
            compressionRatio: number;
            // Video-specific stats
            videoStorageUsed: number;
            videoOriginalSize: number;
            videoSpaceSaved: number;
            avgCompressionRatio: number;
            avgProcessingTime: number;
          };
        }>(response);
      },

      // Upload video file (optimized with compression)
      upload: async (data: {
        videoFile: File;
        courseId?: number;
        lessonId?: number;
        title?: string;
        replaceExisting?: boolean;
      }) => {
        const formData = new FormData();
        formData.append("video", data.videoFile);
        if (data.courseId)
          formData.append("courseId", data.courseId.toString());
        if (data.lessonId)
          formData.append("lessonId", data.lessonId.toString());
        if (data.title) formData.append("title", data.title);
        if (data.replaceExisting) formData.append("replaceExisting", "true");

        const response = await fetch(`${API_BASE_URL}/admin/videos/upload`, {
          method: "POST",
          headers: getAuthOnlyHeaders(),
          body: formData,
        });

        return parseResponse<{
          success: boolean;
          video: {
            id: number;
            type: "uploaded";
            filename: string;
            mimeType: string;
            size: number;
            originalSize: number;
            compressionRatio: number;
            isCompressed: boolean;
            processingTime: number;
            url: string;
            thumbnailUrl: string;
            createdAt: string;
            lesson?: any;
            course?: any;
          };
          message: string;
          optimization: {
            originalSizeMB: number;
            compressedSizeMB: number;
            spaceSavedMB: number;
            compressionRatio: number;
            processingTime: number;
          };
        }>(response);
      },

      // CHUNKED UPLOAD SUPPORT
      // Initialize chunked upload session
      initChunkedUpload: async (data: {
        filename: string;
        mimeType: string;
        totalSize: number;
      }) => {
        const response = await fetch(
          `${API_BASE_URL}/admin/videos/chunk/init`,
          {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
          },
        );
        return parseResponse<{
          success: boolean;
          upload: {
            sessionId: string;
            chunkSize: number;
            totalChunks: number;
          };
          message: string;
        }>(response);
      },

      // Upload individual chunk
      uploadChunk: async (data: {
        sessionId: string;
        chunkIndex: number;
        chunkData: File | Blob;
      }) => {
        const formData = new FormData();
        formData.append("chunk", data.chunkData);

        const response = await fetch(
          `${API_BASE_URL}/admin/videos/chunk/${data.sessionId}/${data.chunkIndex}`,
          {
            method: "POST",
            headers: getAuthOnlyHeaders(),
            body: formData,
          },
        );

        return parseResponse<{
          success: boolean;
          chunk: {
            chunkIndex: number;
            uploadedChunks: number;
            totalChunks: number;
            isComplete: boolean;
          };
          message: string;
        }>(response);
      },

      // Complete chunked upload
      completeChunkedUpload: async (data: {
        sessionId: string;
        courseId?: number;
        lessonId?: number;
        title?: string;
        replaceExisting?: boolean;
      }) => {
        const response = await fetch(
          `${API_BASE_URL}/admin/videos/chunk/${data.sessionId}/complete`,
          {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({
              courseId: data.courseId,
              lessonId: data.lessonId,
              title: data.title,
              replaceExisting: data.replaceExisting,
            }),
          },
        );

        return parseResponse<{
          success: boolean;
          video: {
            id: number;
            type: "uploaded";
            filename: string;
            mimeType: string;
            size: number;
            originalSize: number;
            compressionRatio: number;
            isCompressed: boolean;
            processingTime: number;
            url: string;
            thumbnailUrl: string;
            createdAt: string;
            lesson?: any;
            course?: any;
          };
          message: string;
          optimization: {
            originalSizeMB: number;
            compressedSizeMB: number;
            spaceSavedMB: number;
            compressionRatio: number;
            processingTime: number;
          };
        }>(response);
      },

      // Get chunked upload status
      getChunkedUploadStatus: async (sessionId: string) => {
        const response = await fetch(
          `${API_BASE_URL}/admin/videos/chunk/${sessionId}/status`,
          {
            headers: getAuthHeaders(),
          },
        );
        return parseResponse<{
          success: boolean;
          status: {
            sessionId: string;
            filename: string;
            uploadedChunks: number;
            totalChunks: number;
            progress: number;
            isComplete: boolean;
            createdAt: string;
          };
        }>(response);
      },

      // Cancel chunked upload
      cancelChunkedUpload: async (sessionId: string) => {
        const response = await fetch(
          `${API_BASE_URL}/admin/videos/chunk/${sessionId}`,
          {
            method: "DELETE",
            headers: getAuthHeaders(),
          },
        );
        return parseResponse<{
          success: boolean;
          result: { cancelled: boolean };
          message: string;
        }>(response);
      },

      // Get video thumbnail
      getThumbnail: (videoId: number): string => {
        return `${API_BASE_URL}/admin/videos/${videoId}/thumbnail`;
      },

      // Add external video URL
      addExternal: async (data: {
        courseId?: number;
        lessonId: number;
        videoUrl: string;
        title?: string;
        description?: string;
      }) => {
        const response = await fetch(`${API_BASE_URL}/admin/videos/external`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        });
        return parseResponse<{
          success: boolean;
          video: {
            id: string;
            type: "external";
            title: string;
            url: string;
            lesson: any;
            course: any;
          };
          message: string;
        }>(response);
      },

      // Delete video
      delete: async (id: number | string, type: "uploaded" | "external") => {
        const response = await fetch(
          `${API_BASE_URL}/admin/videos/${id}?type=${type}`,
          {
            method: "DELETE",
            headers: getAuthHeaders(),
          },
        );
        return parseResponse<{
          success: boolean;
          message: string;
          linkedLessons?: string;
        }>(response);
      },

      // Link existing uploaded video to lesson
      linkToLesson: async (
        videoId: number,
        data: {
          lessonId: number;
          replaceExisting?: boolean;
        },
      ) => {
        const response = await fetch(
          `${API_BASE_URL}/admin/videos/${videoId}/link`,
          {
            method: "PUT",
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
          },
        );
        return parseResponse<{
          success: boolean;
          message: string;
          video: {
            id: number;
            filename: string;
            url: string;
            thumbnailUrl: string;
            lesson: any;
            course: any;
          };
        }>(response);
      },

      // Get courses for dropdown
      getCourses: async () => {
        const response = await fetch(`${API_BASE_URL}/admin/videos/courses`, {
          headers: getAuthHeaders(),
        });
        return parseResponse<{
          success: boolean;
          courses: Array<{
            id: number;
            title: string;
            category: string;
            level: string;
            lessonCount: number;
          }>;
        }>(response);
      },

      // Get lessons for a course
      getLessons: async (courseId: number) => {
        const response = await fetch(
          `${API_BASE_URL}/admin/videos/courses/${courseId}/lessons`,
          {
            headers: getAuthHeaders(),
          },
        );
        return parseResponse<{
          success: boolean;
          course: {
            id: number;
            title: string;
          };
          lessons: Array<{
            id: number;
            title: string;
            orderIndex: number;
            duration: string | null;
            hasVideo: boolean;
            videoType: "uploaded" | "external" | null;
          }>;
        }>(response);
      },
    },
  },

  center: {
    async login(centerAdminId: string, password: string) {
      const response = await fetch(`${API_BASE_URL}/center/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ centerAdminId, password }),
      });
      return parseResponse<{
        message: string;
        accessToken: string;
        refreshToken: string;
        center: {
          id: number;
          centerName: string;
          schoolName: string;
          centerCode: string;
          contactPerson: string;
          phoneNumber: string;
          email: string;
          status: string;
        };
      }>(response);
    },

    async getProfile() {
      const response = await fetch(`${API_BASE_URL}/center/me`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("centerToken")}` },
      });
      return parseResponse<{
        center: {
          id: number;
          centerName: string;
          schoolName: string;
          centerCode: string;
          contactPerson: string;
          phoneNumber: string;
          email: string;
          status: string;
          totalStudents: number;
        };
      }>(response);
    },

    async getDashboardStats() {
      const response = await fetch(`${API_BASE_URL}/center/dashboard/stats`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("centerToken")}` },
      });
      return parseResponse<{
        stats: {
          totalStudents: number;
          enrolledCourses: number;
          completedCourses: number;
          inProgressCourses: number;
          totalLearningHours: number;
          averageProgress: number;
          activeToday: number;
        };
      }>(response);
    },

    async getStudents(params?: { page?: number; limit?: number; search?: string; course?: string }) {
      const query = new URLSearchParams();
      if (params?.page) query.set("page", params.page.toString());
      if (params?.limit) query.set("limit", params.limit.toString());
      if (params?.search) query.set("search", params.search);
      if (params?.course) query.set("course", params.course);

      const response = await fetch(`${API_BASE_URL}/center/students?${query}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("centerToken")}` },
      });
      return parseResponse<{
        students: Array<{
          id: number;
          name: string;
          username: string;
          email: string | null;
          rollNumber: string | null;
          createdAt: string;
          enrolledCourses: Array<{ id: number; title: string; enrolledAt: string }>;
          totalCourses: number;
          completedCourses: number;
          avgProgress: number;
          lastActivity: string | null;
          dailyUsageLast7Days: number;
        }>;
        pagination: { total: number; page: number; limit: number; totalPages: number };
      }>(response);
    },

    async getStudentDetails(studentId: number) {
      const response = await fetch(`${API_BASE_URL}/center/students/${studentId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("centerToken")}` },
      });
      return parseResponse<{
        student: {
          id: number;
          name: string;
          username: string;
          email: string | null;
          rollNumber: string | null;
          createdAt: string;
        };
        coursesProgress: Array<{
          course: { id: number; title: string; category: string; level: string; totalLessons: number };
          enrolledAt: string;
          progress: {
            completed: boolean;
            currentLessonId: number;
            startedAt: string;
            completedAt: string | null;
            lastAccessedAt: string;
            completedLessons: number;
            progressPercentage: number;
          };
          lessons: Array<{
            lessonId: number;
            title: string;
            section: string | null;
            orderIndex: number;
            completed: boolean;
            completedAt: string | null;
          }>;
        }>;
        totalLearningHours: number;
        learningStreak: number;
        dailyUsage: Array<{ date: string; seconds: number; hours: number }>;
      }>(response);
    },

    async getCourses() {
      const response = await fetch(`${API_BASE_URL}/center/courses`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("centerToken")}` },
      });
      return parseResponse<{
        courses: Array<{
          id: number;
          title: string;
          category: string;
          level: string;
          instructor: string;
          duration: string;
          totalLessons: number;
          enrolledStudents: number;
          completedStudents: number;
          inProgressStudents: number;
          completionRate: number;
        }>;
      }>(response);
    },

    async getActivity(limit?: number) {
      const response = await fetch(`${API_BASE_URL}/center/activity?limit=${limit || 50}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("centerToken")}` },
      });
      return parseResponse<{
        activities: Array<{
          type: "lesson_complete" | "course_complete";
          userId: number;
          userName: string;
          timestamp: string;
          data: Record<string, unknown>;
        }>;
      }>(response);
    },

    async logout(refreshToken: string) {
      const response = await fetch(`${API_BASE_URL}/center/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      return parseResponse<{ message: string }>(response);
    },
  },
};

export { ApiResponseError };
export type { ApiError };
