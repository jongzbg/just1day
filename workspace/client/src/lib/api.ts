import axios from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

// Auth endpoints
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (email: string, password: string, username: string, displayName: string) =>
    api.post('/auth/register', { email, password, username, displayName }),
  me: () => api.get('/auth/me'),
}

// User endpoints
export const userApi = {
  getProfile: (username: string) => api.get(`/users/${username}`),
  updateProfile: (data: any) => api.patch('/users/me', data),
  follow: (userId: string) => api.post(`/users/${userId}/follow`),
  unfollow: (userId: string) => api.delete(`/users/${userId}/follow`),
  getTopCreators: () => api.get('/users/top/creators'),
  getMostLiked: () => api.get('/users/most-likes'),
}

export { API_BASE_URL }

// Post endpoints
export const postApi = {
  getFeed: (cursor?: string) => api.get('/posts/feed', { params: { cursor } }),
  getFollowingFeed: (cursor?: string) => api.get('/posts/following-feed', { params: { cursor } }),
  getUserPosts: (username: string, cursor?: string) => api.get(`/posts/user/${username}`, { params: { cursor } }),
  getUserReposts: (username: string, cursor?: string) =>
    api.get(`/posts/user/${username}/reposts`, { params: { cursor } }),
  getUserLikedPosts: (username: string, cursor?: string) =>
    api.get(`/posts/user/${username}/likes`, { params: { cursor } }),
  getPost: (postId: string) => api.get(`/posts/${postId}`),
  createPost: (content: string, mediaUrls?: string[]) =>
    api.post('/posts', { content, mediaUrls }),
  deletePost: (postId: string) => api.delete(`/posts/${postId}`),
  like: (postId: string) => api.post(`/posts/${postId}/like`),
  unlike: (postId: string) => api.delete(`/posts/${postId}/like`),
  toggleLike: (postId: string) => api.post(`/posts/${postId}/like`),
  repost: (postId: string) => api.post(`/posts/${postId}/repost`),
  unrepost: (postId: string) => api.delete(`/posts/${postId}/repost`),
  quotePost: (postId: string, content: string) =>
    api.post(`/posts/${postId}/quote`, { content }),
  pinPost: (postId: string) => api.post(`/posts/${postId}/pin`),
  unpinPost: (postId: string) => api.delete(`/posts/${postId}/pin`),
  getComments: (postId: string, cursor?: string) =>
    api.get(`/posts/${postId}/comments`, { params: { cursor } }),
  createComment: (postId: string, content: string) =>
    api.post(`/posts/${postId}/comment`, { content }),
  deleteComment: (commentId: string) => api.delete(`/posts/comments/${commentId}`),
  getThread: (postId: string) => api.get(`/posts/${postId}/thread`),
  createReply: (postId: string, content: string) =>
    api.post(`/posts/${postId}/reply`, { content }),
}