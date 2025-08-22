"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Star,
  X,
  Share,
  FileText,
  ChevronDown,
  Play,
  Pause,
} from "lucide-react";
import type { LibraryItem, MediaStatus } from "@/types";
import type { MusicDetailData } from "@/types/musicTypes";
import { musicServiceV2 } from "@/services/musicServiceV2";
import {
  musicMetacriticService,
  type MetacriticScore,
} from "@/services/musicMetacriticService";
import {
  userReviewsService,
  type UserReview,
} from "@/services/userReviewsService";
import { avatarService } from "@/services/avatarService";
import { musicVideoService } from "@/services/musicVideoService";
import { AuthService } from "@/services/authService";
import { fanartService } from "@/services/fanartService";
import StackrLoadingSkeleton from "./StackrLoadingSkeleton";
import ShareWithFriendsModal from "./ShareWithFriendsModal";

interface MusicDetailModalV4Props {
  isOpen: boolean;
  onClose: () => void;
  musicId: string;
  onAddToLibrary: (item: any, status: MediaStatus) => void;
  onDeleteItem?: (id: string) => void;
  library: LibraryItem[];
  onMusicSelect?: (musicId: string) => void;
}

// Real friends data - empty array like boardgame modal
const FRIENDS_WHO_LISTENED: any[] = [];

// Types for comments
interface Comment {
  id: string;
  userId: string;
  username: string;
  text: string;
  timestamp: string;
  likes: number;
  isLiked: boolean;
}

export default function MusicDetailModalV4({
  isOpen,
  onClose,
  musicId,
  onAddToLibrary,
  onDeleteItem,
  library,
  onMusicSelect,
}: MusicDetailModalV4Props): JSX.Element | null {
  const [musicDetail, setMusicDetail] = useState<MusicDetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<MediaStatus | null>(
    null,
  );
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [albumTracks, setAlbumTracks] = useState<any[]>([]);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showShareWithFriendsModal, setShowShareWithFriendsModal] =
    useState(false);
  const [showFriendsWhoListened, setShowFriendsWhoListened] = useState(false);
  const [showFriendsListModal, setShowFriendsListModal] = useState(false);
  const [showInlineRating, setShowInlineRating] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "media">("overview");
  const [expandedUserReview, setExpandedUserReview] = useState(false);
  const [reviewSaved, setReviewSaved] = useState(false);
  // Photo de profil utilisateur - récupérée via AuthService - COMME MOVIE MODAL
  const [currentUser, setCurrentUser] = useState<any | null>(null);

  // États pour Your Review interactions Instagram-like
  const [userReviewData, setUserReviewData] = useState({
    isLiked: false,
    likesCount: 0,
    commentsCount: 0,
    comments: [] as any[],
  });

  // États pour modales et commentaires
  const [showUserReviewComments, setShowUserReviewComments] = useState(false);
  const [showShareUserReviewModal, setShowShareUserReviewModal] =
    useState(false);
  const [newComment, setNewComment] = useState("");
  const [showMusicSheet, setShowMusicSheet] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [musicSheetData, setMusicSheetData] = useState({
    dateListened: "",
    location: "",
    mood: "",
    format: "streaming",
    personalRating: 0,
    personalReview: "",
  });

  // Review states
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [userReview, setUserReview] = useState("");
  const [reviewPrivacy, setReviewPrivacy] = useState<"private" | "public">(
    "private",
  );
  const [currentUserReview, setCurrentUserReview] = useState<UserReview | null>(
    null,
  );

  // Metacritic states
  const [metacriticScore, setMetacriticScore] =
    useState<MetacriticScore | null>(null);
  const [loadingMetacritic, setLoadingMetacritic] = useState(false);
  const [loadingTracks, setLoadingTracks] = useState(false);

  // Video states
  const [musicVideo, setMusicVideo] = useState<any>(null);
  const [loadingVideo, setLoadingVideo] = useState(false);
  const [videosLoaded, setVideosLoaded] = useState(false);

  // Fanart images states
  const [artistImages, setArtistImages] = useState<string[]>([]);
  const [loadingFanart, setLoadingFanart] = useState(false);
  const [fanartLoaded, setFanartLoaded] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(
    null,
  );
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);

  // Mobile reliability states (inspired by movie modal)
  const [isUserInteracting, setIsUserInteracting] = useState(false);
  const [lastUserAction, setLastUserAction] = useState<number>(0);

  // État pour tracker si c'est la première ouverture du modal (pour éviter les syncs répétées)
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Format ID function - ensure consistent formatting
  const formatMusicId = useCallback((id: string) => {
    console.log("🎵 [FormatID] Input ID:", id);

    // If already formatted, return as is
    if (id.startsWith("track-") || id.startsWith("album-")) {
      console.log("🎵 [FormatID] Already formatted:", id);
      return id;
    }

    // For legacy numeric IDs, default to track format
    const formatted = `track-${id}`;
    console.log("🎵 [FormatID] Legacy ID formatted as:", formatted);
    return formatted;
  }, []);

  // Get formatted music ID
  const formattedMusicId = useMemo(
    () => formatMusicId(musicId),
    [musicId, formatMusicId],
  );

  // Extract type from musicId
  const isAlbum = formattedMusicId.startsWith("album-");
  const isSingle = formattedMusicId.startsWith("track-");

  // Clean up audio function
  const cleanupAudio = useCallback(() => {
    if (audioRef) {
      console.log("🎵 [Audio] Cleaning up audio element");
      audioRef.pause();
      audioRef.currentTime = 0;
      audioRef.removeEventListener("ended", () => setIsPreviewPlaying(false));
      audioRef.removeEventListener("error", () => setIsPreviewPlaying(false));
      setAudioRef(null);
    }
    setIsPreviewPlaying(false);
  }, [audioRef]);

  const handleClose = useCallback(() => {
    console.log("🎵 [Close] Closing modal and cleaning up");
    // Clean up audio when closing
    cleanupAudio();
    // Reset all states
    setShowShareModal(false);
    setShowStatusDropdown(false);
    onClose();
  }, [cleanupAudio, onClose]);

  // Format track duration
  const formatTrackDuration = (milliseconds?: number): string => {
    if (!milliseconds) return "3:30";
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // Load album tracks
  const loadAlbumTracks = useCallback(
    async (albumId: string, albumTitle: string, artistName: string) => {
      console.log("🎵 [AlbumTracks] Loading tracks for album:", albumId);

      try {
        const cleanId = albumId.replace("album-", "");
        const response = await fetch(
          `/api/itunes?endpoint=lookup&id=${cleanId}&entity=song&limit=50`,
          { signal: AbortSignal.timeout(8000) },
        );

        if (!response.ok) {
          throw new Error(`Album tracks lookup failed: ${response.status}`);
        }

        const data = await response.json();

        if (!data.results || data.results.length <= 1) {
          setAlbumTracks([]);
          return;
        }

        const tracks = data.results
          .filter(
            (item: any) =>
              item.wrapperType === "track" &&
              item.kind === "song" &&
              item.artistName?.toLowerCase() === artistName.toLowerCase(),
          )
          .map((track: any, index: number) => ({
            id: `track-${track.trackId}`,
            name: track.trackName,
            duration: formatTrackDuration(track.trackTimeMillis),
            trackNumber: track.trackNumber || index + 1,
            previewUrl: track.previewUrl,
            artist: track.artistName,
          }))
          .sort((a: any, b: any) => a.trackNumber - b.trackNumber);

        console.log(
          `🎵 [AlbumTracks] Found ${tracks.length} tracks for album:`,
          albumTitle,
        );
        setAlbumTracks(tracks);
      } catch (error) {
        console.error("🎵 [AlbumTracks] Error loading album tracks:", error);
        setAlbumTracks([]);
      }
    },
    [],
  );

  // Load Metacritic score
  const loadMetacriticScore = useCallback(
    async (title: string, artist: string) => {
      try {
        setLoadingMetacritic(true);
        const score = await musicMetacriticService.getMetacriticScore(
          artist,
          title,
          isAlbum,
        );
        setMetacriticScore(score);
      } catch (error) {
        console.error("Error loading Metacritic score:", error);
      } finally {
        setLoadingMetacritic(false);
      }
    },
    [isAlbum],
  );

  // Load existing review
  const loadExistingReview = useCallback(async (mediaId: string) => {
    try {
      const existingReview =
        await userReviewsService.getUserReviewForMedia(mediaId);
      if (existingReview) {
        setCurrentUserReview(existingReview);
        setUserRating(existingReview.rating);
        setUserReview(existingReview.review_text || "");
        setReviewPrivacy(existingReview.is_public ? "public" : "private");
      }
    } catch (error) {
      console.error("Error loading existing review:", error);
    }
  }, []);

  // Load music video
  const loadMusicVideo = useCallback(async () => {
    if (!musicDetail?.artist || !musicDetail?.title || videosLoaded) return;

    try {
      setLoadingVideo(true);
      setVideosLoaded(true);
      const video = await musicVideoService.getMusicVideo(
        musicDetail.artist,
        musicDetail.title,
      );
      setMusicVideo(video);
      console.log("🎵 [MusicModal] Video loaded:", video);
    } catch (error) {
      console.error("🎵 [MusicModal] Error loading video:", error);
    } finally {
      setLoadingVideo(false);
    }
  }, [musicDetail?.artist, musicDetail?.title, videosLoaded]);

  // Save review function
  const handleSaveReview = useCallback(async () => {
    if (!musicDetail) return;

    try {
      setReviewSaved(true);

      // Save to localStorage
      const reviewData = {
        rating: userRating,
        review: userReview,
        privacy: reviewPrivacy,
        interactions: userReviewData,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(
        `music-review-${formattedMusicId}`,
        JSON.stringify(reviewData),
      );

      // Also save to backend service
      await userReviewsService.submitReview({
        mediaId: musicDetail.id,
        mediaTitle: musicDetail.title,
        mediaCategory: "music",
        rating: userRating,
        reviewText: userReview,
        isPublic: reviewPrivacy === "public",
      });

      // Only close review box after saving if there's review text
      // Otherwise keep it open for user to continue writing
      if (userReview.trim()) {
        setTimeout(() => {
          setShowInlineRating(false);
          setReviewSaved(false);
        }, 1000);
      } else {
        // Just show "Saved!" briefly then reset
        setTimeout(() => {
          setReviewSaved(false);
        }, 1000);
      }
    } catch (error) {
      console.error("Error saving review:", error);
      setReviewSaved(false);
    }
  }, [musicDetail, userRating, userReview, reviewPrivacy, formattedMusicId]);

  // Load current user on mount - COMME MOVIE MODAL
  useEffect(() => {
    const loadCurrentUser = async () => {
      const user = await AuthService.getCurrentUser();
      setCurrentUser(user);
    };
    loadCurrentUser();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = AuthService.onAuthStateChange((user) => {
      setCurrentUser(user);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Fonction pour formater le temps Instagram-style
  const formatTimeAgo = useCallback((timestamp: string): string => {
    const now = new Date();
    const then = new Date(timestamp);
    const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w ago`;
    return then.toLocaleDateString();
  }, []);

  // Handler pour liker sa propre review
  const handleLikeUserReview = useCallback(() => {
    const newData = {
      ...userReviewData,
      isLiked: !userReviewData.isLiked,
      likesCount: userReviewData.isLiked
        ? userReviewData.likesCount - 1
        : userReviewData.likesCount + 1,
    };
    setUserReviewData(newData);

    // Save to localStorage
    const existingData = localStorage.getItem(
      `music-review-${formattedMusicId}`,
    );
    const data = existingData ? JSON.parse(existingData) : {};
    localStorage.setItem(
      `music-review-${formattedMusicId}`,
      JSON.stringify({
        ...data,
        interactions: newData,
        timestamp: new Date().toISOString(),
      }),
    );
  }, [userReviewData, formattedMusicId]);

  // Handler pour partager sa review
  const handleShareUserReview = useCallback(() => {
    // Ouvrir la modale ShareWithFriendsModal pour la review
    setShowShareUserReviewModal(true);
  }, []);

  // Handler pour soumettre un commentaire
  const handleSubmitComment = useCallback(() => {
    if (!newComment.trim()) return;

    const comment: Comment = {
      id: Date.now().toString(),
      userId: "current-user",
      username: "You",
      text: newComment,
      timestamp: new Date().toISOString(),
      likes: 0,
      isLiked: false,
    };

    const newData = {
      ...userReviewData,
      comments: [...userReviewData.comments, comment],
      commentsCount: userReviewData.commentsCount + 1,
    };
    setUserReviewData(newData);
    setNewComment("");

    // Save to localStorage
    const existingData = localStorage.getItem(
      `music-review-${formattedMusicId}`,
    );
    const data = existingData ? JSON.parse(existingData) : {};
    localStorage.setItem(
      `music-review-${formattedMusicId}`,
      JSON.stringify({
        ...data,
        interactions: newData,
        timestamp: new Date().toISOString(),
      }),
    );
  }, [newComment, userReviewData, formattedMusicId]);

  // Save music sheet data
  const saveMusicSheetData = useCallback(() => {
    try {
      if (musicDetail) {
        console.log("🎵 [MusicSheet] Saving data:", musicSheetData);
        // Here you would typically save to a database
        // For now, we'll just log and close the modal
        setShowMusicSheet(false);
      }
    } catch (error) {
      console.error("🎵 [MusicSheet] Error saving data:", error);
    }
  }, [musicDetail, musicSheetData]);

  // Load music detail
  const fetchMusicDetail = useCallback(async () => {
    if (!formattedMusicId) return;

    try {
      setLoading(true);

      let detail: MusicDetailData | null = null;

      if (isAlbum) {
        detail = await musicServiceV2.getAlbumDetails(formattedMusicId);
      } else {
        detail = await musicServiceV2.getTrackDetails(formattedMusicId);

        // Validation supplémentaire pour les tracks
        if (detail && (!detail.title || detail.title.trim() === "")) {
          console.warn(
            "🎵 [WARNING] Track detail has invalid title, discarding",
          );
          detail = null;
        }
      }

      setMusicDetail(detail);

      // Load additional data
      if (detail) {
        console.log("🎵 [DEBUG] Loading additional data...");
        loadMetacriticScore(detail.title, detail.artist);
        loadExistingReview(detail.id);

        // Pour les albums uniquement
        if (isAlbum) {
          loadAlbumTracks(detail.id, detail.title, detail.artist);
        }
      }
    } catch (error) {
      console.error("Error fetching music details:", error);
    } finally {
      setLoading(false);
    }
  }, [
    formattedMusicId,
    isAlbum,
    loadAlbumTracks,
    loadMetacriticScore,
    loadExistingReview,
  ]);

  // Effet pour synchroniser le statut avec la bibliothèque - COMME MOVIE MODAL
  useEffect(() => {
    if (isOpen && formattedMusicId && isInitialLoad) {
      console.log(
        "🎵 [MUSIC MODAL] INITIAL LOAD - synchronizing status with library for musicId:",
        formattedMusicId,
      );
      console.log(
        "🎵 [MUSIC MODAL] Current selectedStatus before sync:",
        selectedStatus,
      );

      // Check library status ONLY on modal open (initial load)
      if (library && library.length > 0) {
        const libraryItem = library.find(
          (item) => item.id === formattedMusicId,
        );
        console.log("🔍 [MUSIC MODAL] Found library item:", libraryItem);
        const newStatus = libraryItem?.status || null;
        console.log("🔄 [MUSIC MODAL] Setting INITIAL status to:", newStatus);

        setSelectedStatus(newStatus);
      } else {
        console.log("🔄 [MUSIC MODAL] No library items, setting null status");
        setSelectedStatus(null);
      }

      setIsInitialLoad(false);
      console.log("🔄 [MUSIC MODAL] ✅ Initial load complete");
    }
    // Bloquer toute sync supplémentaire si l'utilisateur a agi récemment (dans les 5 dernières secondes)
    else if (
      isOpen &&
      formattedMusicId &&
      !isInitialLoad &&
      library &&
      library.length > 0 &&
      !isUserInteracting
    ) {
      const timeSinceLastAction = Date.now() - lastUserAction;
      if (timeSinceLastAction > 5000) {
        // Plus de 5 secondes depuis la dernière action
        console.log(
          "🔄 [MUSIC MODAL] Allowing library sync - no recent user action",
        );
        const libraryItem = library.find(
          (item) => item.id === formattedMusicId,
        );
        const newStatus = libraryItem?.status || null;

        // Only update if status actually changed from external source
        if (newStatus !== selectedStatus) {
          console.log(
            `🔄 [MUSIC MODAL] External status change detected: ${selectedStatus} -> ${newStatus}`,
          );
          setSelectedStatus(newStatus);
        }
      } else {
        console.log(
          `🔄 [MUSIC MODAL] Blocking library sync - recent user action (${timeSinceLastAction}ms ago)`,
        );
      }
    }
  }, [
    isOpen,
    formattedMusicId,
    library,
    isInitialLoad,
    selectedStatus,
    lastUserAction,
    isUserInteracting,
  ]);

  // Reset initial load flag when modal closes
  useEffect(() => {
    if (!isOpen) {
      setIsInitialLoad(true);
      setIsUserInteracting(false); // Reset user interaction flag
      console.log("🔄 [MUSIC MODAL] Modal closed - reset for next load");
    }
  }, [isOpen]);

  // Load saved rating, review and interactions from localStorage
  useEffect(() => {
    if (isOpen && formattedMusicId) {
      const savedData = localStorage.getItem(
        `music-review-${formattedMusicId}`,
      );
      if (savedData) {
        const { rating, review, privacy, interactions } = JSON.parse(savedData);
        setUserRating(rating || 0);
        setUserReview(review || "");
        setReviewPrivacy(privacy || "private");

        // Load interactions data
        if (interactions) {
          setUserReviewData({
            isLiked: interactions.isLiked || false,
            likesCount: interactions.likesCount || 0,
            commentsCount: interactions.commentsCount || 0,
            comments: interactions.comments || [],
          });
        }
      } else {
        // Reset when switching to a new music
        setUserRating(0);
        setUserReview("");
        setReviewPrivacy("private");
        setShowInlineRating(false);
        setUserReviewData({
          isLiked: false,
          likesCount: 0,
          commentsCount: 0,
          comments: [],
        });
      }

      // Fetch music detail
      fetchMusicDetail();
    }
  }, [isOpen, formattedMusicId, fetchMusicDetail]);

  // Load artist fanart images
  const loadArtistFanart = useCallback(
    async (artistName: string) => {
      if (fanartLoaded) return;

      try {
        setLoadingFanart(true);
        setFanartLoaded(true);

        console.log("🎨 [Fanart] Loading artist images for:", artistName);

        // First, search for artist MBID
        const mbid = await fanartService.searchArtistByName(artistName);

        if (mbid) {
          // Get gallery images from fanart.tv
          const images = await fanartService.getArtistGalleryImages(mbid);

          if (images && images.length > 0) {
            console.log(
              `🎨 [Fanart] Found ${images.length} images for ${artistName}`,
            );
            setArtistImages(images);
          } else {
            console.log("🎨 [Fanart] No images found for artist");
          }
        } else {
          console.log(
            "🎨 [Fanart] Could not find MBID for artist:",
            artistName,
          );
        }
      } catch (error) {
        console.error("🎨 [Fanart] Error loading artist images:", error);
      } finally {
        setLoadingFanart(false);
      }
    },
    [fanartLoaded],
  );

  // Navigation functions for media carousel
  const nextMedia = () => {
    const totalItems = (musicVideo ? 1 : 0) + artistImages.length;
    if (totalItems > 0) {
      setActiveMediaIndex((prev) => (prev + 1) % totalItems);
    }
  };

  const prevMedia = () => {
    const totalItems = (musicVideo ? 1 : 0) + artistImages.length;
    if (totalItems > 0) {
      setActiveMediaIndex((prev) => (prev - 1 + totalItems) % totalItems);
    }
  };

  // Load videos and fanart images when Media tab is selected
  useEffect(() => {
    if (activeTab === "media" && musicDetail) {
      console.log(
        "🎨 [Fanart] Media tab activated for artist:",
        musicDetail.artist,
      );

      // Load video for singles
      if (!isAlbum && !videosLoaded) {
        loadMusicVideo();
      }

      // Load fanart images for artist
      if (!fanartLoaded && musicDetail.artist) {
        console.log(
          "🎨 [Fanart] Triggering fanart load for:",
          musicDetail.artist,
        );
        loadArtistFanart(musicDetail.artist);
      } else if (fanartLoaded) {
        console.log("🎨 [Fanart] Already loaded, skipping");
      }
    }
  }, [
    activeTab,
    musicDetail,
    isAlbum,
    videosLoaded,
    fanartLoaded,
    loadArtistFanart,
    loadMusicVideo,
  ]);

  // Cleanup on modal close
  useEffect(() => {
    if (!isOpen) {
      console.log("🎵 [Cleanup] Modal closed, cleaning up all states");
      cleanupAudio();

      // Reset all states when modal closes to prevent double modals
      setMusicDetail(null);
      setSelectedStatus(null);
      setShowStatusDropdown(false);
      setShowShareModal(false);
      setShowShareWithFriendsModal(false);
      setShowFriendsWhoListened(false);
      setShowFriendsListModal(false);
      setShowInlineRating(false);
      setActiveTab("overview");
      setUserRating(0);
      setHoverRating(0);
      setUserReview("");
      setReviewPrivacy("private");
      setExpandedUserReview(false);
      setReviewSaved(false);
      setCurrentUserReview(null);
      setUserReviewData({
        isLiked: false,
        likesCount: 0,
        commentsCount: 0,
        comments: [],
      });
      setShowUserReviewComments(false);
      setShowShareUserReviewModal(false);
      setNewComment("");
      setAlbumTracks([]);
      setLoadingTracks(false);
      setMetacriticScore(null);
      setLoadingMetacritic(false);
      setMusicVideo(null);
      setLoadingVideo(false);
      setVideosLoaded(false);
      setArtistImages([]);
      setLoadingFanart(false);
      setFanartLoaded(false);
      setSelectedImageIndex(null);
      setIsUserInteracting(false); // Reset protection flag
      setIsInitialLoad(true); // Reset for next load
    }
  }, [isOpen, cleanupAudio]);

  // Load artist images for header as soon as modal opens
  useEffect(() => {
    if (isOpen && musicDetail?.artist && !fanartLoaded) {
      console.log(
        "🎨 [Header] Loading Fanart.tv images for header:",
        musicDetail.artist,
      );
      loadArtistFanart(musicDetail.artist);
    }
  }, [isOpen, musicDetail?.artist, fanartLoaded, loadArtistFanart]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      console.log("🎵 [Unmount] Component unmounting, final cleanup");
      if (audioRef) {
        audioRef.pause();
        audioRef.currentTime = 0;
        audioRef.src = "";
      }
    };
  }, [audioRef]);

  // Audio preview controls
  const handlePreviewToggle = useCallback(() => {
    let previewUrl = musicDetail?.previewUrl;

    // For albums, try to use the first track's preview if album doesn't have one
    if (!previewUrl && isAlbum && albumTracks.length > 0) {
      const trackWithPreview = albumTracks.find((track) => track.previewUrl);
      if (trackWithPreview) {
        previewUrl = trackWithPreview.previewUrl;
      }
    }

    if (!previewUrl) {
      console.log("🎵 [Audio] No preview URL available");
      return;
    }

    if (isPreviewPlaying) {
      console.log("🎵 [Audio] Stopping preview");
      if (audioRef) {
        audioRef.pause();
        audioRef.currentTime = 0;
        setAudioRef(null);
      }
      setIsPreviewPlaying(false);
    } else {
      console.log("🎵 [Audio] Starting preview:", previewUrl);

      // Clean up any existing audio first
      if (audioRef) {
        cleanupAudio();
      }

      const audio = new Audio(previewUrl);

      // Set up event listeners
      const handleEnded = () => {
        console.log("🎵 [Audio] Preview ended");
        setIsPreviewPlaying(false);
        setAudioRef(null);
      };

      const handleError = (e: any) => {
        console.error("🎵 [Audio] Preview error - failed to load:", previewUrl);
        setIsPreviewPlaying(false);
        setAudioRef(null);
      };

      audio.addEventListener("ended", handleEnded);
      audio.addEventListener("error", handleError);

      // Start playing
      audio
        .play()
        .then(() => {
          setAudioRef(audio);
          setIsPreviewPlaying(true);
        })
        .catch((error) => {
          console.error("🎵 [Audio] Failed to start preview:", error);
          setIsPreviewPlaying(false);
        });
    }
  }, [
    musicDetail?.previewUrl,
    isPreviewPlaying,
    audioRef,
    isAlbum,
    albumTracks,
  ]);

  // Go to album
  const handleGoToAlbum = useCallback(() => {
    if (!isAlbum && musicDetail?.parentAlbum && onMusicSelect) {
      console.log(
        "🎵 [Navigation] Going to album:",
        musicDetail.parentAlbum.id,
      );
      const albumId = musicDetail.parentAlbum.id.startsWith("album-")
        ? musicDetail.parentAlbum.id
        : `album-${musicDetail.parentAlbum.id}`;
      onMusicSelect(albumId);
    }
  }, [isAlbum, musicDetail?.parentAlbum, onMusicSelect]);

  // Track navigation
  const handleTrackSelect = useCallback(
    (trackId: string) => {
      if (onMusicSelect) {
        console.log("🎵 [Navigation] Going to track:", trackId);
        // Clean up audio before navigation
        if (audioRef) {
          audioRef.pause();
          audioRef.currentTime = 0;
          setAudioRef(null);
        }
        setIsPreviewPlaying(false);
        onMusicSelect(trackId);
      }
    },
    [onMusicSelect, audioRef],
  );

  // Handle status selection - COMME MOVIE MODAL - AVEC PROTECTION SUPABASE REAL-TIME
  const handleAddToLibrary = useCallback(
    async (status: MediaStatus) => {
      if (!musicDetail) return;

      // PROTECTION: Marquer que l'utilisateur interagit pour éviter les overrides Supabase
      const actionTimestamp = Date.now();
      console.log(
        "🎵 [MUSIC MODAL] 🔒 User interaction started - blocking real-time sync",
      );
      setIsUserInteracting(true);
      setLastUserAction(actionTimestamp);

      // Handle remove from library
      if (status === null || status === "remove") {
        console.log("🎵 [MUSIC MODAL] Removing item from library");
        if (onDeleteItem) {
          await onDeleteItem(musicDetail.id);

          // Force library refresh for mobile reliability
          setTimeout(() => {
            const event = new CustomEvent("library-changed", {
              detail: {
                action: "deleted",
                item: { id: musicDetail.id, title: musicDetail.title },
                timestamp: Date.now(),
              },
            });
            window.dispatchEvent(event);
            console.log(
              "🔔 [MUSIC MODAL] Forced library-changed event for mobile",
            );
          }, 500);
        }
        setSelectedStatus(null);
        setShowStatusDropdown(false);

        // Reset protection après délai pour les suppressions
        // Délai réduit sur mobile pour améliorer la réactivité
        const isMobile =
          /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            navigator.userAgent,
          );
        const removalDelay = isMobile ? 1000 : 2000;
        setTimeout(() => {
          console.log(
            "🎵 [MUSIC MODAL] 🔓 User interaction ended (removal) - allowing real-time sync",
          );
          setIsUserInteracting(false);
        }, removalDelay);
        return;
      }

      // Prepare music data for library
      const musicData = {
        id: musicDetail.id,
        title: musicDetail.title,
        category: "music" as const,
        image: musicDetail.image,
        year: musicDetail.releaseDate
          ? new Date(musicDetail.releaseDate).getFullYear()
          : 2024,
        rating: musicDetail.rating || 4.0,
        artist: musicDetail.artist,
        genre: musicDetail.genre || "Music",
        duration: musicDetail.duration,
        type: musicDetail.type || (isAlbum ? "album" : "single"),
      };

      try {
        console.log(
          "🎵 [MUSIC MODAL] ⏳ Starting library update with status:",
          status,
        );
        console.log(
          "🎵 [MUSIC MODAL] Current selectedStatus before update:",
          selectedStatus,
        );

        // Set status optimistically (immediate UI feedback)
        setSelectedStatus(status);
        setShowStatusDropdown(false);

        // Add/update item in library
        await onAddToLibrary(musicData, status);

        // Force library refresh for mobile reliability
        setTimeout(() => {
          const event = new CustomEvent("library-changed", {
            detail: {
              action: "updated",
              item: { id: musicDetail.id, title: musicDetail.title, status },
              timestamp: Date.now(),
            },
          });
          window.dispatchEvent(event);
          console.log(
            "🔔 [MUSIC MODAL] Forced library-changed event for mobile",
          );
        }, 500);

        console.log(
          "🎵 [MUSIC MODAL] ✅ Library update completed with status:",
          status,
        );

        // Show inline rating for listened status
        if (status === "listened") {
          setShowInlineRating(true);
        }

        console.log(
          "🎵 [MUSIC MODAL] ✅ Successfully updated library with status:",
          status,
        );
      } catch (error) {
        console.error("🎵 [ERROR] Failed to update library:", error);
        // En cas d'erreur, revenir au statut précédent
        const libraryItem = library.find((item) => item.id === musicDetail.id);
        setSelectedStatus(libraryItem?.status || null);
      } finally {
        // PROTECTION: Débloquer la synchronisation après un délai pour permettre à Supabase de se synchroniser
        // Délai réduit sur mobile pour améliorer la réactivité
        const isMobile =
          /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            navigator.userAgent,
          );
        const protectionDelay = isMobile ? 1500 : 3000;
        setTimeout(() => {
          console.log(
            "🎵 [MUSIC MODAL] 🔓 User interaction ended - allowing real-time sync",
          );
          setIsUserInteracting(false);
        }, protectionDelay);
      }
    },
    [musicDetail, onAddToLibrary, onDeleteItem, library],
  );

  // Get available statuses
  const getAvailableStatuses = useCallback(() => {
    const baseStatuses = [
      { value: "want-to-listen", label: "Want to Listen" },
      { value: "listened", label: "Listened" },
    ];

    if (selectedStatus) {
      baseStatuses.push({ value: "remove", label: "Remove from Library" });
    }

    return baseStatuses;
  }, [selectedStatus]);

  // Format status for display
  const formatStatusForDisplay = (status: MediaStatus | null) => {
    if (!status) return "Add to Library";

    const statusLabels = {
      "want-to-listen": "Want to Listen",
      listened: "Listened",
    } as const;

    return (
      statusLabels[status as keyof typeof statusLabels] || "Add to Library"
    );
  };

  if (!isOpen) return null;

  if (loading) {
    return (
      <div className="fixed top-0 left-0 right-0 bottom-16 z-30 bg-[#0f0e17] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!musicDetail) {
    return (
      <div className="fixed top-0 left-0 right-0 bottom-16 z-30 bg-[#0f0e17] font-system overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center text-gray-400 px-6">
            <div className="text-6xl mb-4">🎵</div>
            <div className="text-lg mb-2">Music not found</div>
            <div className="text-sm mb-6">
              Unable to load details for this {isAlbum ? "album" : "track"}.
            </div>
            <button
              onClick={handleClose}
              className="px-6 py-2 bg-gradient-to-r from-gray-600 to-gray-800 hover:from-gray-700 hover:to-gray-900 text-white rounded-lg transition-all duration-200"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const hasPreview =
    musicDetail?.previewUrl ||
    (isAlbum && albumTracks.some((t) => t.previewUrl));

  return (
    <div className="fixed top-0 left-0 right-0 bottom-16 z-30 bg-[#0f0e17] font-system overflow-y-auto">
      {/* Header with backdrop image */}
      <div className="relative h-[200px] overflow-hidden">
        <img
          src={
            artistImages.length > 0
              ? artistImages[0]
              : musicDetail.image ||
                "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1280&h=720&fit=crop&q=80"
          }
          alt={
            artistImages.length > 0
              ? `${musicDetail.artist} - Artist backdrop`
              : `${musicDetail.title} backdrop`
          }
          className="w-full h-full object-cover"
          loading="eager"
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f0e17] via-[#0f0e17]/60 to-transparent" />

        {/* Close button */}
        <div className="absolute top-0 right-0 p-5">
          <button
            onClick={handleClose}
            className="w-10 h-10 bg-black/30 border border-white/20 rounded-xl text-white flex items-center justify-center backdrop-blur-xl transition-all duration-200 active:scale-95 hover:bg-black/50"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Music Info Section */}
      <div className="px-6 py-6 relative -mt-16">
        {/* Thumbnail + Basic Info */}
        <div className="flex gap-4 items-start mb-4 relative z-10">
          {/* Music Thumbnail - Same size as book modal */}
          <div className="w-[100px] h-[100px] rounded-2xl overflow-hidden border-2 border-white/10 flex-shrink-0">
            <img
              src={musicDetail.image}
              alt={musicDetail.title}
              className="w-full h-full object-cover"
              loading="eager"
              style={{
                imageRendering: "crisp-edges",
                backfaceVisibility: "hidden",
              }}
            />
          </div>

          {/* Title and Artist - Same style as book modal */}
          <div className="flex-1 pt-1">
            <h1 className="text-xl font-bold text-white mb-1 leading-tight">
              {musicDetail.title}
            </h1>
            <p className="text-sm text-gray-400 mb-1">{musicDetail.artist}</p>

            {/* Music Stats - Same style as book modal */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
              {musicDetail.releaseDate && (
                <span>{new Date(musicDetail.releaseDate).getFullYear()}</span>
              )}
              {musicDetail.genre && (
                <>
                  <span className="text-gray-600">•</span>
                  <span>{musicDetail.genre}</span>
                </>
              )}
              {musicDetail.duration && (
                <>
                  <span className="text-gray-600">•</span>
                  <span>{musicDetail.duration}</span>
                </>
              )}
              {/* Type Badge inline with stats */}
              <>
                <span className="text-gray-600">•</span>
                <span>{isAlbum ? "Album" : "Single"}</span>
              </>
              {isAlbum && albumTracks.length > 0 && (
                <>
                  <span className="text-gray-600">•</span>
                  <span>{albumTracks.length} tracks</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 mt-3">
          {/* Status Button */}
          <div className="relative flex-1">
            <button
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
              className="w-full h-12 px-3 bg-gradient-to-r from-gray-600 to-gray-800 text-white font-medium rounded-lg hover:from-gray-700 hover:to-gray-900 transition-all duration-200 flex items-center justify-center space-x-1 text-xs"
            >
              <span className="truncate">
                {formatStatusForDisplay(selectedStatus)}
              </span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                className={`transition-transform flex-shrink-0 ${showStatusDropdown ? "rotate-180" : ""}`}
              >
                <path
                  d="M6 9l6 6 6-6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {/* Dropdown */}
            {showStatusDropdown && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#1A1A1A] border border-purple-500 rounded-lg shadow-2xl z-[99999]">
                {getAvailableStatuses().map((status) => (
                  <button
                    key={status.value}
                    onClick={() =>
                      handleAddToLibrary(status.value as MediaStatus)
                    }
                    className={`w-full text-left px-4 py-3 text-sm hover:bg-purple-600/20 hover:text-purple-400 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                      selectedStatus === status.value
                        ? "text-purple-400 bg-purple-600/30"
                        : "text-gray-300"
                    } ${status.value === "remove" ? "text-red-400 hover:bg-red-600/20" : ""}`}
                  >
                    {status.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Preview Button - Square with icon only */}
          {hasPreview && (
            <button
              onClick={handlePreviewToggle}
              className="w-12 h-12 bg-white hover:bg-gray-100 text-black rounded-lg transition-all duration-200 flex items-center justify-center"
              title={isPreviewPlaying ? "Stop Preview" : "Play Preview"}
            >
              {isPreviewPlaying ? <Pause size={16} /> : <Play size={16} />}
            </button>
          )}

          {/* Share Button */}
          <button
            onClick={() => setShowShareWithFriendsModal(true)}
            className="h-12 px-3 bg-gradient-to-r from-gray-600 to-gray-800 hover:from-gray-700 hover:to-gray-900 text-white rounded-lg transition-all duration-200 flex items-center space-x-1 text-xs"
          >
            <Share size={14} />
            <span>Share</span>
          </button>
        </div>

        {/* Friends who listened - EXACTLY LIKE BOOKS */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <span className="text-gray-400 text-sm">
                Friends who listened:
              </span>
              {false ? (
                <span className="text-gray-500 text-sm">Loading...</span>
              ) : FRIENDS_WHO_LISTENED.length > 0 ? (
                <div className="flex -space-x-1">
                  {FRIENDS_WHO_LISTENED.slice(0, 4).map((friend) =>
                    friend.avatar_url ? (
                      <img
                        key={friend.friend_id}
                        src={friend.avatar_url}
                        alt={friend.display_name || friend.username}
                        className="w-6 h-6 rounded-full border-2 border-[#0f0e17] cursor-pointer hover:scale-110 transition-transform"
                        title={`${friend.display_name || friend.username}${friend.rating ? ` - ${friend.rating}/5 stars` : ""}`}
                      />
                    ) : (
                      <div
                        key={friend.friend_id}
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium border-2 border-[#0f0e17] cursor-pointer hover:scale-110 transition-transform"
                        style={{
                          backgroundColor: avatarService.getAvatarColor(
                            friend.friend_id,
                          ),
                        }}
                        title={`${friend.display_name || friend.username}${friend.rating ? ` - ${friend.rating}/5 stars` : ""}`}
                      >
                        {avatarService.getInitials(
                          friend.display_name || friend.username,
                        )}
                      </div>
                    ),
                  )}
                  {FRIENDS_WHO_LISTENED.length > 4 && (
                    <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center text-xs font-medium border-2 border-[#0f0e17] cursor-pointer hover:scale-110 transition-transform">
                      +{FRIENDS_WHO_LISTENED.length - 4}
                    </div>
                  )}
                </div>
              ) : (
                <span className="text-gray-500 text-sm">None</span>
              )}
            </div>
            {FRIENDS_WHO_LISTENED.length > 0 && (
              <button
                onClick={() => setShowFriendsListModal(true)}
                className="text-gray-400 hover:text-purple-400 text-sm transition-colors"
              >
                View all
              </button>
            )}
          </div>

          {/* Customize music sheet - LIKE BOOKS */}
          <button
            onClick={() => setShowMusicSheet(true)}
            className="text-purple-400 hover:text-purple-300 text-sm flex items-center space-x-1 cursor-pointer transition-colors"
          >
            <FileText size={14} />
            <span>Customize music sheet</span>
          </button>
        </div>

        {/* Tabs: Overview / Videos */}
        <div className="mt-6 mb-4">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
                activeTab === "overview"
                  ? "bg-purple-600 text-white"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("media")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
                activeTab === "media"
                  ? "bg-purple-600 text-white"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              Videos / Photos
            </button>
          </div>
        </div>

        {/* Overview Content */}
        <div style={{ display: activeTab === "overview" ? "block" : "none" }}>
          <div className="space-y-8">
            {/* Rate this music section - EXACTLY LIKE BOOKS */}
            <div className="mt-4">
              <div className="text-gray-400 text-sm mb-1">
                Rate this {isAlbum ? "album" : "song"}
              </div>

              <div className="flex items-center space-x-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={async () => {
                      // Allow editing: if same rating is clicked, reset to 0
                      const newRating = userRating === star ? 0 : star;
                      setUserRating(newRating);

                      // Open review box when rating (but not when clearing)
                      if (newRating > 0) {
                        setShowInlineRating(true);
                        // Save rating immediately to localStorage
                        const existingData = localStorage.getItem(
                          `music-review-${formattedMusicId}`,
                        );
                        const data = existingData
                          ? JSON.parse(existingData)
                          : {};
                        localStorage.setItem(
                          `music-review-${formattedMusicId}`,
                          JSON.stringify({
                            ...data,
                            rating: newRating,
                            interactions: userReviewData,
                            timestamp: new Date().toISOString(),
                          }),
                        );
                      } else {
                        setShowInlineRating(false);
                        // Clear saved data when rating is reset to 0
                        localStorage.removeItem(
                          `music-review-${formattedMusicId}`,
                        );
                        setUserReview("");
                      }

                      // Note: Rating will be saved when user clicks "Save Review" button
                      // No auto-save here to prevent closing the review box prematurely
                    }}
                    className="transition-all duration-200 hover:scale-110"
                  >
                    <Star
                      size={18}
                      className={`${
                        star <= (hoverRating || userRating)
                          ? "text-purple-400 fill-purple-400 drop-shadow-sm"
                          : "text-gray-600 hover:text-gray-500"
                      } transition-colors`}
                    />
                  </button>
                ))}
                {userRating > 0 && (
                  <span className="text-gray-400 text-sm ml-2">
                    {userRating}/5
                  </span>
                )}
              </div>
            </div>

            {/* Review section - EXACTLY LIKE BOOKS - ONLY if rating > 0 */}
            {showInlineRating && userRating > 0 && (
              <div className="mb-6 bg-gradient-to-b from-[#1a1a1a] via-[#161616] to-[#121212] border border-gray-700/50 rounded-lg p-4">
                <h3 className="text-white font-medium mb-3">
                  Share your thoughts
                </h3>

                {/* Review Text Area */}
                <div className="space-y-3">
                  <textarea
                    value={userReview}
                    onChange={(e) => setUserReview(e.target.value)}
                    placeholder="Write your review... (optional)"
                    className="w-full bg-black/20 border border-purple-500/30 rounded-lg p-3 text-white placeholder-gray-400 resize-none focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20"
                    rows={3}
                  />

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-white/70 text-sm">
                        Review privacy:
                      </span>
                      <div className="flex bg-black/30 rounded-lg p-1">
                        <button
                          onClick={() => setReviewPrivacy("private")}
                          className={`px-3 py-1 rounded-md text-xs transition-colors ${
                            reviewPrivacy === "private"
                              ? "bg-purple-600 text-white"
                              : "text-white/60 hover:text-white/80"
                          }`}
                        >
                          Private
                        </button>
                        <button
                          onClick={() => setReviewPrivacy("public")}
                          className={`px-3 py-1 rounded-md text-xs transition-colors ${
                            reviewPrivacy === "public"
                              ? "bg-purple-600 text-white"
                              : "text-white/60 hover:text-white/80"
                          }`}
                        >
                          Public
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {!userReview.trim() ? (
                        <button
                          onClick={() => {
                            // Skip: close the review box but keep the rating saved
                            setShowInlineRating(false);
                            // Save rating without review text
                            const reviewData = {
                              rating: userRating,
                              review: "",
                              privacy: reviewPrivacy,
                              interactions: userReviewData,
                              timestamp: new Date().toISOString(),
                            };
                            localStorage.setItem(
                              `music-review-${formattedMusicId}`,
                              JSON.stringify(reviewData),
                            );
                          }}
                          className="px-3 py-1 bg-gray-700 text-gray-300 text-xs font-medium rounded-md hover:bg-gray-600 transition-colors"
                        >
                          Skip
                        </button>
                      ) : (
                        <button
                          onClick={handleSaveReview}
                          className={`px-3 py-1 text-white text-xs font-medium rounded-md transition-all duration-200 ${
                            reviewSaved
                              ? "bg-green-600 hover:bg-green-700"
                              : "bg-gradient-to-r from-gray-600 to-gray-800 hover:from-gray-700 hover:to-gray-900"
                          }`}
                        >
                          {reviewSaved ? "Saved!" : "Save Review"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Your Review - Style Instagram (shown if user has rating but review box is closed) */}
            {userRating > 0 && !showInlineRating && (
              <div className="mb-6 md:mb-8 bg-gradient-to-b from-[#1a1a1a] via-[#161616] to-[#121212] rounded-lg p-4 md:p-6 border border-gray-700/50">
                {/* Header: Title + Privacy + Edit */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-white font-semibold text-base">
                      Your review
                    </h3>
                    <span className="text-gray-400 text-xs">
                      ({reviewPrivacy})
                    </span>
                  </div>
                  <button
                    onClick={() => setShowInlineRating(true)}
                    className="text-white text-xs font-medium hover:text-gray-300 transition-colors"
                  >
                    Edit
                  </button>
                </div>

                {/* Fine ligne blanche */}
                <div className="border-t border-white/10 mb-4"></div>

                {/* Review content */}
                <div className="py-2">
                  {/* Avatar + You + Rating */}
                  <div className="flex items-center space-x-3 mb-2">
                    {currentUser?.avatar ? (
                      <img
                        src={currentUser.avatar}
                        alt="Your avatar"
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-indigo-700 rounded-full flex items-center justify-center text-xs font-medium text-white">
                        {currentUser
                          ? currentUser.name?.[0]?.toUpperCase() ||
                            currentUser.email[0]?.toUpperCase()
                          : "U"}
                      </div>
                    )}
                    <div className="flex items-center space-x-2 flex-1">
                      <span className="text-white font-medium text-sm">
                        {currentUser?.name || "You"}
                      </span>
                      {/* Rating en violet */}
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={12}
                            className={`${
                              star <= userRating
                                ? "text-purple-400 fill-current"
                                : "text-gray-600"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Review text */}
                  {userReview && (
                    <div className="mb-3 ml-11">
                      <p className="text-gray-300 text-sm leading-relaxed">
                        {expandedUserReview
                          ? userReview
                          : userReview.length > 60
                            ? userReview.substring(0, 60) + "..."
                            : userReview}
                        {userReview.length > 60 && (
                          <button
                            onClick={() =>
                              setExpandedUserReview(!expandedUserReview)
                            }
                            className="text-gray-400 hover:text-gray-300 ml-1 text-xs"
                          >
                            {expandedUserReview ? "...less" : "...more"}
                          </button>
                        )}
                      </p>
                    </div>
                  )}

                  {/* Actions Instagram style avec compteurs */}
                  <div className="ml-11">
                    <div className="flex items-center space-x-4">
                      {/* Like - Heart outline avec compteur */}
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleLikeUserReview()}
                          className={`transition-colors ${userReviewData.isLiked ? "text-red-500" : "text-gray-400 hover:text-gray-300"}`}
                        >
                          {userReviewData.isLiked ? (
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                            </svg>
                          ) : (
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.5"
                            >
                              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                            </svg>
                          )}
                        </button>
                        {userReviewData.likesCount > 0 && (
                          <span className="text-gray-300 text-xs">
                            {userReviewData.likesCount}
                          </span>
                        )}
                      </div>

                      {/* Comment - Chat bubble avec compteur */}
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => setShowUserReviewComments(true)}
                          className="text-gray-400 hover:text-gray-300 transition-colors"
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          >
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                          </svg>
                        </button>
                        {userReviewData.commentsCount > 0 && (
                          <span className="text-gray-300 text-xs">
                            {userReviewData.commentsCount}
                          </span>
                        )}
                      </div>

                      {/* Share - Send arrow */}
                      <button
                        onClick={() => handleShareUserReview()}
                        className="text-gray-400 hover:text-gray-300 transition-colors"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        >
                          <path d="M22 2L11 13" />
                          <path d="M22 2L15 22L11 13L2 9L22 2Z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Description - Like Book Modal */}
            {musicDetail?.description && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-3">
                  Description
                </h3>
                <div className="text-gray-400 leading-relaxed text-sm">
                  {musicDetail.description}
                </div>
              </div>
            )}

            {/* Music Info - Like Book Modal Info Section */}
            <div className="space-y-2 text-sm mb-6">
              {musicDetail?.genre && (
                <div className="text-sm flex">
                  <span className="text-gray-400 w-24 flex-shrink-0">
                    Genre:
                  </span>
                  <span className="text-white">{musicDetail.genre}</span>
                </div>
              )}
              {musicDetail?.releaseDate && (
                <div className="text-sm flex">
                  <span className="text-gray-400 w-24 flex-shrink-0">
                    Released:
                  </span>
                  <span className="text-white">
                    {new Date(musicDetail.releaseDate).toLocaleDateString()}
                  </span>
                </div>
              )}
              {isAlbum && musicDetail?.trackCount && (
                <div className="text-sm flex">
                  <span className="text-gray-400 w-24 flex-shrink-0">
                    Tracks:
                  </span>
                  <span className="text-white">{musicDetail.trackCount}</span>
                </div>
              )}
              {!isAlbum && musicDetail?.duration && (
                <div className="text-sm flex">
                  <span className="text-gray-400 w-24 flex-shrink-0">
                    Duration:
                  </span>
                  <span className="text-white">{musicDetail.duration}</span>
                </div>
              )}

              {/* Content Rating */}
              {(musicDetail?.trackExplicitness ||
                musicDetail?.collectionExplicitness) && (
                <div className="text-sm flex">
                  <span className="text-gray-400 w-24 flex-shrink-0">
                    Content:
                  </span>
                  <span className="text-white">
                    {musicDetail.trackExplicitness === "explicit" ||
                    musicDetail.collectionExplicitness === "Explicit"
                      ? "Explicit"
                      : "Clean"}
                  </span>
                </div>
              )}

              {/* Price */}
              {(musicDetail?.trackPrice || musicDetail?.collectionPrice) && (
                <div className="text-sm flex">
                  <span className="text-gray-400 w-24 flex-shrink-0">
                    Price:
                  </span>
                  <span className="text-white">
                    {musicDetail.currency === "USD" ? "$" : ""}
                    {isAlbum
                      ? musicDetail.collectionPrice
                      : musicDetail.trackPrice}
                    {musicDetail.currency !== "USD"
                      ? ` ${musicDetail.currency}`
                      : ""}
                  </span>
                </div>
              )}

              {/* Buy Links - Like Book Modal */}
              {(musicDetail?.itunesUrl || musicDetail?.title) && (
                <div className="text-sm flex">
                  <span className="text-gray-400 w-24 flex-shrink-0">Buy:</span>
                  <div className="flex items-center space-x-3">
                    {musicDetail.itunesUrl && (
                      <a
                        href={musicDetail.itunesUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300"
                      >
                        iTunes
                      </a>
                    )}
                    <a
                      href={`https://www.amazon.com/s?k=${encodeURIComponent(musicDetail?.title + " " + musicDetail?.artist)}&tag=drrriguessss-20`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-orange-400 hover:text-orange-300"
                    >
                      Amazon 🔍
                    </a>
                  </div>
                </div>
              )}

              {/* Copyright */}
              {musicDetail?.copyright && (
                <div className="text-sm flex">
                  <span className="text-gray-400 w-24 flex-shrink-0">
                    Copyright:
                  </span>
                  <span className="text-white text-xs">
                    {musicDetail.copyright}
                  </span>
                </div>
              )}
            </div>

            {/* Album Link for Singles - Enhanced */}
            {!isAlbum && musicDetail.parentAlbum && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-3">
                  From the Album
                </h3>
                <button
                  onClick={handleGoToAlbum}
                  className="flex items-center space-x-3 p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors w-full text-left"
                >
                  <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={musicDetail.image}
                      alt={musicDetail.parentAlbum.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">
                      {musicDetail.parentAlbum.title}
                    </p>
                    <p className="text-gray-400 text-sm">
                      {musicDetail.artist} • {musicDetail.parentAlbum.year}
                    </p>
                  </div>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="text-gray-400"
                  >
                    <path
                      d="M9 18l6-6-6-6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            )}

            {/* Track List for Albums */}
            {isAlbum && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-3">
                  Tracklist
                </h3>

                {albumTracks.length > 0 ? (
                  <div className="space-y-2">
                    {albumTracks.map((track, index) => (
                      <div
                        key={track.id}
                        className="flex items-center justify-between p-3 bg-gradient-to-b from-[#1a1a1a] via-[#161616] to-[#121212] border border-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer group"
                        onClick={() => handleTrackSelect(track.id)}
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-gray-400 text-sm w-6 text-center font-mono">
                            {track.trackNumber}
                          </span>
                          <div className="flex-1">
                            <p className="text-white group-hover:text-purple-400 transition-colors">
                              {track.name}
                            </p>
                            <p className="text-gray-500 text-xs">
                              {track.artist}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {track.previewUrl && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                console.log(
                                  "🎵 [DEBUG] Playing preview for track:",
                                  track.name,
                                );
                              }}
                              className="w-6 h-6 bg-purple-600/20 hover:bg-purple-600/40 rounded-full flex items-center justify-center transition-colors"
                              title="Preview"
                            >
                              <Play size={10} className="text-white ml-0.5" />
                            </button>
                          )}
                          <span className="text-gray-400 text-sm font-mono">
                            {track.duration}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-400 py-4">
                    <p className="text-sm">Loading tracks...</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Videos Content */}
        <div style={{ display: activeTab === "media" ? "block" : "none" }}>
          <div className="mt-4 space-y-6">
            {/* Loading state for fanart */}
            {loadingFanart && (
              <div className="text-center text-gray-400 py-4">
                <div className="text-sm">Loading artist images...</div>
              </div>
            )}

            {/* Main Media Display Area */}
            {((!isAlbum && musicVideo) || artistImages.length > 0) && (
              <div className="space-y-4">
                {/* Main display area */}
                <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                  {/* Display video if it's selected and embeddable */}
                  {activeMediaIndex === 0 &&
                  musicVideo &&
                  musicVideo.isEmbeddable ? (
                    <iframe
                      src={musicVideo.embedUrl}
                      title={`${musicDetail?.title} - ${musicDetail?.artist} (Official Music Video)`}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      loading="lazy"
                    />
                  ) : activeMediaIndex === 0 &&
                    musicVideo &&
                    !musicVideo.isEmbeddable ? (
                    /* Video thumbnail with play button for non-embeddable videos */
                    <div className="relative w-full h-full group cursor-pointer">
                      <div className="absolute inset-0">
                        {musicDetail?.image ? (
                          <img
                            src={musicDetail.image}
                            alt="Video thumbnail"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900"></div>
                        )}
                      </div>

                      {/* Dark overlay */}
                      <div className="absolute inset-0 bg-black/60 group-hover:bg-black/40 transition-colors"></div>

                      {/* YouTube branding and play button */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4">
                        {/* YouTube logo */}
                        <div className="bg-red-600 px-4 py-2 rounded-lg flex items-center space-x-2">
                          <svg
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            className="text-white"
                          >
                            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                          </svg>
                          <span className="text-white font-medium">
                            YouTube
                          </span>
                        </div>

                        {/* Large play button */}
                        <div className="bg-red-600 hover:bg-red-700 rounded-full p-6 group-hover:scale-110 transition-transform">
                          <svg
                            width="32"
                            height="32"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            className="text-white"
                          >
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>

                        <div className="text-white text-center">
                          <div className="font-medium text-lg">
                            Official Music Video
                          </div>
                          <div className="text-red-200 text-sm">
                            Click to watch on YouTube
                          </div>
                        </div>
                      </div>

                      {/* Click overlay */}
                      <a
                        href={musicVideo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute inset-0"
                      />
                    </div>
                  ) : (
                    /* Display artist image */
                    artistImages[
                      musicVideo ? activeMediaIndex - 1 : activeMediaIndex
                    ] && (
                      <img
                        src={
                          artistImages[
                            musicVideo ? activeMediaIndex - 1 : activeMediaIndex
                          ]
                        }
                        alt={`${musicDetail?.artist} - Image ${activeMediaIndex + 1}`}
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() =>
                          setSelectedImageIndex(
                            musicVideo
                              ? activeMediaIndex - 1
                              : activeMediaIndex,
                          )
                        }
                      />
                    )
                  )}

                  {/* Navigation arrows for main display */}
                  {(musicVideo ? 1 : 0) + artistImages.length > 1 && (
                    <>
                      <button
                        onClick={prevMedia}
                        className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-black/60 hover:bg-black/80 text-white p-3 rounded-full transition-colors"
                      >
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M15 18l-6-6 6-6" />
                        </svg>
                      </button>

                      <button
                        onClick={nextMedia}
                        className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-black/60 hover:bg-black/80 text-white p-3 rounded-full transition-colors"
                      >
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M9 18l6-6-6-6" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>

                {/* Thumbnails carousel */}
                <div className="space-y-2">
                  <div className="text-sm text-gray-400">Media Gallery</div>
                  <div className="flex space-x-2 overflow-x-auto pb-2">
                    {/* Video thumbnail */}
                    {musicVideo && (
                      <button
                        onClick={() => setActiveMediaIndex(0)}
                        className={`flex-shrink-0 w-24 h-16 rounded overflow-hidden border-2 transition-colors relative ${
                          activeMediaIndex === 0
                            ? "border-red-500"
                            : "border-transparent hover:border-red-300"
                        }`}
                      >
                        {musicDetail?.image ? (
                          <img
                            src={musicDetail.image}
                            alt="Video thumbnail"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-700"></div>
                        )}
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            className="text-white"
                          >
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-red-600/90 text-white text-xs px-1 py-0.5 text-center">
                          VIDEO
                        </div>
                      </button>
                    )}

                    {/* Artist Images thumbnails */}
                    {artistImages.map((image, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          const imageIndex = musicVideo ? index + 1 : index;
                          setActiveMediaIndex(imageIndex);
                        }}
                        className={`flex-shrink-0 w-24 h-16 rounded overflow-hidden border-2 transition-colors ${
                          (musicVideo ? index + 1 : index) === activeMediaIndex
                            ? "border-purple-500"
                            : "border-transparent hover:border-purple-300"
                        }`}
                      >
                        <img
                          src={image}
                          alt={`Artist image ${index + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = "none";
                          }}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Lightbox for full-size image viewing */}
            {selectedImageIndex !== null && (
              <div
                className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
                onClick={() => setSelectedImageIndex(null)}
              >
                <button
                  onClick={() => setSelectedImageIndex(null)}
                  className="absolute top-4 right-4 text-white/80 hover:text-white p-2"
                >
                  <X className="w-6 h-6" />
                </button>
                <img
                  src={artistImages[selectedImageIndex]}
                  alt={`${musicDetail?.artist} - Full size`}
                  className="max-w-full max-h-full object-contain"
                />
                {/* Navigation arrows */}
                {selectedImageIndex > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedImageIndex(selectedImageIndex - 1);
                    }}
                    className="absolute left-4 text-white/80 hover:text-white p-2"
                  >
                    <ChevronDown className="w-8 h-8 rotate-90" />
                  </button>
                )}
                {selectedImageIndex < artistImages.length - 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedImageIndex(selectedImageIndex + 1);
                    }}
                    className="absolute right-4 text-white/80 hover:text-white p-2"
                  >
                    <ChevronDown className="w-8 h-8 -rotate-90" />
                  </button>
                )}
              </div>
            )}

            {isAlbum && !loadingFanart && artistImages.length === 0 && (
              <div className="text-center text-gray-400 py-16">
                <div className="text-6xl mb-4">📀</div>
                <div className="text-lg mb-2">No media available</div>
                <div className="text-sm">
                  No artist photos found for this album
                </div>
              </div>
            )}

            {!isAlbum && loadingVideo && (
              <div className="text-center text-gray-400 py-16">
                <div className="text-lg mb-2">Loading video...</div>
                <div className="text-sm">
                  Finding the best music video for this track
                </div>
              </div>
            )}

            {!isAlbum &&
              !loadingVideo &&
              !musicVideo &&
              artistImages.length === 0 && (
                // No video found - show multiple search options
                <div className="space-y-6">
                  <div className="text-center py-8">
                    <div className="text-6xl mb-4">🎵</div>
                    <div className="text-white text-lg mb-2">
                      No official video found
                    </div>
                    <div className="text-gray-400 text-sm">
                      Try searching for live performances, covers, or lyric
                      videos
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="text-white font-medium text-center mb-4">
                      Search Options:
                    </div>

                    <a
                      href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${musicDetail?.artist || ""} ${musicDetail?.title || ""} official music video`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors group relative overflow-hidden"
                    >
                      {/* Background album image with overlay */}
                      <div className="absolute inset-0 opacity-20">
                        <img
                          src={
                            musicDetail?.image ||
                            "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=200&fit=crop&q=80"
                          }
                          alt=""
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-red-600/80"></div>
                      </div>

                      <div className="flex items-center space-x-3 relative z-10">
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                        </svg>
                        <div>
                          <div className="font-medium">
                            Official Music Video
                          </div>
                          <div className="text-red-200 text-sm">
                            Search for the official video
                          </div>
                        </div>
                      </div>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="group-hover:translate-x-1 transition-transform relative z-10"
                      >
                        <path d="M5 12h14" />
                        <path d="M12 5l7 7-7 7" />
                      </svg>
                    </a>

                    <a
                      href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${musicDetail?.artist || ""} ${musicDetail?.title || ""} live performance`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors group relative overflow-hidden"
                    >
                      {/* Background album image with overlay */}
                      <div className="absolute inset-0 opacity-20">
                        <img
                          src={
                            musicDetail?.image ||
                            "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=200&fit=crop&q=80"
                          }
                          alt=""
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-purple-600/80"></div>
                      </div>

                      <div className="flex items-center space-x-3 relative z-10">
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M9 9h3l3-3h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9Z" />
                          <path d="M9 9V6a3 3 0 0 1 6 0v3" />
                        </svg>
                        <div>
                          <div className="font-medium">Live Performance</div>
                          <div className="text-purple-200 text-sm">
                            Find live concerts or performances
                          </div>
                        </div>
                      </div>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="group-hover:translate-x-1 transition-transform relative z-10"
                      >
                        <path d="M5 12h14" />
                        <path d="M12 5l7 7-7 7" />
                      </svg>
                    </a>

                    <a
                      href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${musicDetail?.artist || ""} ${musicDetail?.title || ""} lyrics video`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors group relative overflow-hidden"
                    >
                      {/* Background album image with overlay */}
                      <div className="absolute inset-0 opacity-20">
                        <img
                          src={
                            musicDetail?.image ||
                            "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=200&fit=crop&q=80"
                          }
                          alt=""
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-blue-600/80"></div>
                      </div>

                      <div className="flex items-center space-x-3 relative z-10">
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14,2 14,8 20,8" />
                          <line x1="16" y1="13" x2="8" y2="13" />
                          <line x1="16" y1="17" x2="8" y2="17" />
                          <polyline points="10,9 9,9 8,9" />
                        </svg>
                        <div>
                          <div className="font-medium">Lyrics Video</div>
                          <div className="text-blue-200 text-sm">
                            Search for lyric videos
                          </div>
                        </div>
                      </div>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="group-hover:translate-x-1 transition-transform relative z-10"
                      >
                        <path d="M5 12h14" />
                        <path d="M12 5l7 7-7 7" />
                      </svg>
                    </a>
                  </div>
                </div>
              )}
          </div>
        </div>
      </div>

      {/* Comments Modal - Style Instagram */}
      {showUserReviewComments && (
        <div className="fixed inset-0 z-60 bg-black/50">
          {/* Overlay cliquable pour fermer */}
          <div
            className="absolute inset-0"
            onClick={() => setShowUserReviewComments(false)}
          />

          {/* Modal sliding from bottom */}
          <div className="absolute bottom-0 left-0 right-0 bg-gray-900 rounded-t-2xl max-h-[80vh] flex flex-col">
            {/* Handle bar */}
            <div className="flex justify-center p-2">
              <div className="w-10 h-1 bg-gray-600 rounded-full"></div>
            </div>

            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-700">
              <h3 className="text-white font-semibold text-center">Comments</h3>
            </div>

            {/* Comments list */}
            <div className="flex-1 overflow-y-auto px-4 py-2">
              {userReviewData.comments.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-sm">No comments yet</div>
                  <div className="text-gray-500 text-xs mt-1">
                    Be the first to comment
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {userReviewData.comments.map((comment) => (
                    <div key={comment.id} className="flex space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-indigo-700 rounded-full flex items-center justify-center text-xs font-medium text-white flex-shrink-0">
                        {comment.username[0]}
                      </div>
                      <div className="flex-1">
                        <div className="bg-gray-800 rounded-2xl px-3 py-2">
                          <div className="text-white text-sm font-medium">
                            {comment.username}
                          </div>
                          <div className="text-gray-300 text-sm">
                            {comment.text}
                          </div>
                        </div>
                        <div className="flex items-center space-x-4 mt-1 ml-3">
                          <span className="text-gray-500 text-xs">
                            {formatTimeAgo(comment.timestamp)}
                          </span>
                          <button className="text-gray-500 text-xs font-medium">
                            Like
                          </button>
                          <button className="text-gray-500 text-xs font-medium">
                            Reply
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Comment input */}
            <div className="p-4 border-t border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-indigo-700 rounded-full flex items-center justify-center text-xs font-medium text-white">
                  U
                </div>
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="What do you think?"
                    className="w-full bg-gray-800 text-white rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    onKeyPress={(e) =>
                      e.key === "Enter" && handleSubmitComment()
                    }
                  />
                  {newComment.trim() && (
                    <button
                      onClick={handleSubmitComment}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-purple-400 text-sm font-medium"
                    >
                      Post
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share User Review Modal */}
      {showShareUserReviewModal && musicDetail && userReview && (
        <ShareWithFriendsModal
          isOpen={showShareUserReviewModal}
          onClose={() => setShowShareUserReviewModal(false)}
          item={{
            id: `${musicDetail.id}-review`,
            type: "review",
            title: `My review: "${musicDetail.title}"`,
            image: musicDetail.image,
            reviewText: userReview,
            rating: userRating,
          }}
        />
      )}

      {/* Modals en dehors du contenu principal */}
      {showShareWithFriendsModal && musicDetail && (
        <ShareWithFriendsModal
          isOpen={showShareWithFriendsModal}
          onClose={() => setShowShareWithFriendsModal(false)}
          item={{
            id: musicDetail.id,
            type: "music",
            title: musicDetail.title,
            image: musicDetail.image,
          }}
        />
      )}

      {/* Friends Who Listened Modal */}
      {false && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl w-full max-w-md max-h-[70vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-white font-semibold text-lg">
                Friends who listened
              </h3>
              <button
                onClick={() => setShowFriendsListModal(false)}
                className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-gray-300 hover:text-white hover:bg-gray-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div
              className="p-4 overflow-y-auto"
              style={{ maxHeight: "calc(70vh - 80px)" }}
            >
              {FRIENDS_WHO_LISTENED.map((friend) => (
                <div
                  key={friend.friend_id}
                  className="flex items-center space-x-3 py-3"
                >
                  {/* Avatar */}
                  {friend.avatar_url ? (
                    <img
                      src={friend.avatar_url}
                      alt={friend.display_name || friend.username}
                      className="w-12 h-12 rounded-full"
                    />
                  ) : (
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-medium"
                      style={{
                        backgroundColor: avatarService.getAvatarColor(
                          friend.friend_id,
                        ),
                      }}
                    >
                      {avatarService.getInitials(
                        friend.display_name || friend.username,
                      )}
                    </div>
                  )}

                  {/* Friend Info */}
                  <div className="flex-1">
                    <p className="text-white font-medium">
                      {friend.display_name || friend.username}
                    </p>
                    {friend.hasReview ? (
                      <div className="flex items-center space-x-1 mt-1">
                        {/* Rating stars */}
                        <div className="flex space-x-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <svg
                              key={star}
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="#fbbf24"
                              className="text-yellow-400"
                            >
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                          ))}
                        </div>
                        <span className="text-gray-400 text-xs ml-1">
                          • Left a review
                        </span>
                      </div>
                    ) : (
                      <p className="text-gray-400 text-sm">Listened recently</p>
                    )}
                  </div>

                  {/* Status */}
                  <div className="text-xs text-gray-500">2d ago</div>
                </div>
              ))}

              {/* Placeholder message */}
              <div className="text-center py-8 text-gray-400">
                <p className="text-sm">
                  Reviews and ratings from friends coming soon!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Music Sheet Modal */}
      {showMusicSheet && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-white">Music Sheet</h3>
              <button
                onClick={() => setShowMusicSheet(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <label className="block text-gray-400 text-sm mb-1">
                  Date listened
                </label>
                <div
                  onClick={() => setShowDatePicker(true)}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 border border-gray-600 hover:border-gray-500 cursor-pointer flex items-center justify-between"
                >
                  <span
                    className={
                      musicSheetData.dateListened
                        ? "text-white"
                        : "text-gray-400"
                    }
                  >
                    {musicSheetData.dateListened
                      ? new Date(
                          musicSheetData.dateListened,
                        ).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : "Select date"}
                  </span>
                  <svg
                    className="w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>

                {/* Modern Calendar Picker - EXACTEMENT COMME BOOK MODAL */}
                {showDatePicker && (
                  <div
                    className={`absolute top-0 left-0 z-10 bg-white border border-gray-300 rounded-lg shadow-2xl overflow-hidden ${
                      showMonthPicker
                        ? "w-80 h-48"
                        : showYearPicker
                          ? "w-80 h-96"
                          : "w-80 h-auto"
                    }`}
                  >
                    {/* Calendar Header */}
                    <div className="bg-gray-50 border-b border-gray-200 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <button
                          onClick={() => {
                            const newDate = new Date(calendarDate);
                            newDate.setMonth(newDate.getMonth() - 1);
                            setCalendarDate(newDate);
                          }}
                          className="p-1 hover:bg-gray-200 rounded text-gray-600"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 19l-7-7 7-7"
                            />
                          </svg>
                        </button>

                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setShowMonthPicker(!showMonthPicker)}
                            className="px-3 py-1 hover:bg-gray-200 rounded text-gray-800 font-medium text-sm flex items-center"
                          >
                            {calendarDate.toLocaleDateString("en-US", {
                              month: "long",
                            })}
                            <svg
                              className="w-3 h-3 ml-1"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() => setShowYearPicker(!showYearPicker)}
                            className="px-3 py-1 hover:bg-gray-200 rounded text-gray-800 font-medium text-sm flex items-center"
                          >
                            {calendarDate.getFullYear()}
                            <svg
                              className="w-3 h-3 ml-1"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </button>
                        </div>

                        <button
                          onClick={() => {
                            const newDate = new Date(calendarDate);
                            newDate.setMonth(newDate.getMonth() + 1);
                            setCalendarDate(newDate);
                          }}
                          className="p-1 hover:bg-gray-200 rounded text-gray-600"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </button>
                      </div>

                      <button
                        onClick={() => setShowDatePicker(false)}
                        className="w-full px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                      >
                        Close Calendar
                      </button>
                    </div>

                    {/* Month Picker Overlay */}
                    {showMonthPicker && (
                      <div className="absolute inset-0 bg-white z-20 p-4">
                        <div className="grid grid-cols-4 gap-3">
                          {[
                            "JAN",
                            "FEB",
                            "MAR",
                            "APR",
                            "MAY",
                            "JUN",
                            "JUL",
                            "AUG",
                            "SEP",
                            "OCT",
                            "NOV",
                            "DEC",
                          ].map((month, index) => (
                            <button
                              key={month}
                              onClick={() => {
                                const newDate = new Date(calendarDate);
                                newDate.setMonth(index);
                                setCalendarDate(newDate);
                                setShowMonthPicker(false);
                              }}
                              className={`py-3 px-2 rounded-lg text-sm font-bold transition-colors ${
                                calendarDate.getMonth() === index
                                  ? "bg-blue-500 text-white shadow-lg scale-105"
                                  : "hover:bg-gray-100 text-gray-700 border border-gray-200 hover:border-blue-300"
                              }`}
                            >
                              {month}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Year Picker Overlay */}
                    {showYearPicker && (
                      <div className="absolute inset-0 bg-white z-20 p-4 flex flex-col">
                        <div className="text-center mb-3">
                          <h4 className="text-gray-800 font-medium">
                            Select Year
                          </h4>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                          <div className="grid grid-cols-4 gap-2 pb-4">
                            {Array.from(
                              { length: 80 },
                              (_, i) => new Date().getFullYear() - i,
                            ).map((year) => (
                            <button
                              key={year}
                              onClick={() => {
                                const newDate = new Date(calendarDate);
                                newDate.setFullYear(year);
                                setCalendarDate(newDate);
                                setShowYearPicker(false);
                              }}
                              className={`py-2 px-1 rounded text-xs font-bold transition-colors ${
                                calendarDate.getFullYear() === year
                                  ? "bg-blue-500 text-white shadow-lg scale-105"
                                  : "hover:bg-gray-100 text-gray-700 border border-gray-200 hover:border-blue-300"
                              }`}
                            >
                              {year}
                            </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Calendar Grid */}
                    {!showMonthPicker && !showYearPicker && (
                      <div className="p-3">
                        {/* Days of week header */}
                        <div className="grid grid-cols-7 gap-1 mb-2">
                          {[
                            "Sun",
                            "Mon",
                            "Tue",
                            "Wed",
                            "Thu",
                            "Fri",
                            "Sat",
                          ].map((day) => (
                            <div
                              key={day}
                              className="p-2 text-center text-xs font-medium text-gray-500"
                            >
                              {day}
                            </div>
                          ))}
                        </div>

                        {/* Calendar days grid */}
                        <div className="grid grid-cols-7 gap-1">
                          {(() => {
                            const year = calendarDate.getFullYear();
                            const month = calendarDate.getMonth();
                            const firstDay = new Date(year, month, 1);
                            const lastDay = new Date(year, month + 1, 0);
                            const startDate = new Date(firstDay);
                            startDate.setDate(
                              startDate.getDate() - firstDay.getDay(),
                            );

                            const days = [];
                            const today = new Date();
                            const selectedDate = musicSheetData.dateListened
                              ? new Date(musicSheetData.dateListened)
                              : null;

                            for (let i = 0; i < 42; i++) {
                              const currentDate = new Date(startDate);
                              currentDate.setDate(startDate.getDate() + i);

                              const isCurrentMonth =
                                currentDate.getMonth() === month;
                              const isToday =
                                currentDate.toDateString() === today.toDateString();
                              const isSelected =
                                selectedDate &&
                                currentDate.toDateString() ===
                                  selectedDate.toDateString();
                              const isFuture = currentDate > today;

                              days.push(
                                <button
                                  key={i}
                                  onClick={() => {
                                    if (!isFuture) {
                                      setMusicSheetData({
                                        ...musicSheetData,
                                        dateListened: currentDate
                                          .toISOString()
                                          .split("T")[0],
                                      });
                                      setShowDatePicker(false);
                                    }
                                  }}
                                  disabled={isFuture}
                                  className={`p-2 text-sm font-medium rounded transition-colors ${
                                    isFuture
                                      ? "text-gray-300 cursor-not-allowed"
                                      : isSelected
                                        ? "bg-blue-500 text-white"
                                        : isToday
                                          ? "bg-blue-100 text-blue-600 font-bold"
                                          : isCurrentMonth
                                            ? "hover:bg-gray-100 text-gray-700"
                                            : "text-gray-400 hover:bg-gray-50"
                                  }`}
                                >
                                  {currentDate.getDate()}
                                </button>,
                              );
                            }
                            return days;
                          })()}
                        </div>

                        {/* Footer actions */}
                        <div className="flex justify-between mt-3 pt-3 border-t border-gray-200">
                          <button
                            onClick={() => {
                              const today = new Date();
                              setMusicSheetData({
                                ...musicSheetData,
                                dateListened: today.toISOString().split("T")[0],
                              });
                              setCalendarDate(today);
                            }}
                            className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                          >
                            Today
                          </button>
                          <button
                            onClick={() => {
                              setMusicSheetData({
                                ...musicSheetData,
                                dateListened: "",
                              });
                              setShowDatePicker(false);
                            }}
                            className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={musicSheetData.location}
                  onChange={(e) =>
                    setMusicSheetData({
                      ...musicSheetData,
                      location: e.target.value,
                    })
                  }
                  placeholder="Where did you listen to this?"
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-1">Mood</label>
                <input
                  type="text"
                  value={musicSheetData.mood}
                  onChange={(e) =>
                    setMusicSheetData({
                      ...musicSheetData,
                      mood: e.target.value,
                    })
                  }
                  placeholder="What was your mood?"
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-1">
                  Format
                </label>
                <select
                  value={musicSheetData.format}
                  onChange={(e) =>
                    setMusicSheetData({
                      ...musicSheetData,
                      format: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  <option value="streaming">Streaming</option>
                  <option value="vinyl">Vinyl</option>
                  <option value="cd">CD</option>
                  <option value="digital">Digital download</option>
                  <option value="cassette">Cassette</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">
                  Private Rating
                </label>
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={24}
                      className={`cursor-pointer transition-colors ${
                        star <= musicSheetData.personalRating
                          ? "text-yellow-500 fill-current"
                          : "text-gray-600"
                      }`}
                      onClick={() =>
                        setMusicSheetData({
                          ...musicSheetData,
                          personalRating: star,
                        })
                      }
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-1">
                  Private Review
                </label>
                <textarea
                  value={musicSheetData.personalReview}
                  onChange={(e) =>
                    setMusicSheetData({
                      ...musicSheetData,
                      personalReview: e.target.value,
                    })
                  }
                  placeholder="Write your review..."
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 h-20"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowMusicSheet(false)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={saveMusicSheetData}
                className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
