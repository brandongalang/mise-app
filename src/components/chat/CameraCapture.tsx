'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, RotateCcw, Check, SwitchCamera } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CameraCaptureProps {
    isOpen: boolean;
    onClose: () => void;
    onCapture: (imageData: string, mimeType: string) => void;
}

export function CameraCapture({ isOpen, onClose, onCapture }: CameraCaptureProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSupported, setIsSupported] = useState(true);
    const [flash, setFlash] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    // Check if camera API is supported
    useEffect(() => {
        const supported = typeof navigator !== 'undefined' &&
            'mediaDevices' in navigator &&
            'getUserMedia' in navigator.mediaDevices;
        setIsSupported(supported);
        if (!supported) {
            setError('Camera is not supported on this device or browser.');
            setIsLoading(false);
        }
    }, []);

    // Cleanup stream helper
    const stopStream = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    }, []);

    // Start camera stream
    const startCamera = useCallback(async () => {
        if (!isSupported) return;

        setIsLoading(true);
        setError(null);
        setCapturedImage(null);

        // Stop any existing stream first
        stopStream();

        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: facingMode,
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                },
                audio: false,
            });

            streamRef.current = mediaStream;

            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                // Wait for video to be ready to play
                videoRef.current.onloadedmetadata = async () => {
                    try {
                        await videoRef.current?.play();
                        setIsLoading(false);
                    } catch (e) {
                        console.error("Error playing video:", e);
                    }
                };
            }
        } catch (err) {
            console.error('Camera error:', err);
            setIsLoading(false);
            if (err instanceof DOMException) {
                switch (err.name) {
                    case 'NotAllowedError':
                        setError('Camera access denied. Please allow camera permissions.');
                        break;
                    case 'NotFoundError':
                        setError('No camera found on this device.');
                        break;
                    case 'OverconstrainedError':
                        setError('Camera does not support requested settings.');
                        break;
                    case 'NotReadableError':
                        setError('Camera is in use by another application.');
                        break;
                    default:
                        setError('Could not access camera. Please try again.');
                }
            } else {
                setError('Could not access camera.');
            }
        }
    }, [facingMode, isSupported, stopStream]);

    // Initialize camera when opened
    useEffect(() => {
        if (isOpen && isSupported) {
            startCamera();
        }

        return () => {
            // Cleanup on unmount or when closing
            stopStream();
        };
    }, [isOpen, isSupported, startCamera, stopStream]);

    // Handle close - cleanup and reset state
    const handleClose = useCallback(() => {
        stopStream();
        setCapturedImage(null);
        setError(null);
        onClose();
    }, [onClose, stopStream]);

    // Switch camera
    const switchCamera = useCallback(() => {
        setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    }, []);

    // Restart camera when facing mode changes (only when open and no capture)
    useEffect(() => {
        if (isOpen && !capturedImage && isSupported) {
            startCamera();
        }
    }, [facingMode]); // eslint-disable-line react-hooks/exhaustive-deps

    // Capture photo
    const capturePhoto = useCallback(() => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        if (!ctx) return;

        // Flash effect
        setFlash(true);
        setTimeout(() => setFlash(false), 150);

        // Set canvas size to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw the current frame
        ctx.drawImage(video, 0, 0);

        // Convert to base64
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(imageData);

        // Stop the video stream to save resources
        stopStream();
    }, [stopStream]);

    // Retake photo
    const retakePhoto = useCallback(() => {
        setCapturedImage(null);
        startCamera();
    }, [startCamera]);

    // Confirm and send
    const confirmPhoto = useCallback(() => {
        if (capturedImage) {
            onCapture(capturedImage, 'image/jpeg');
            handleClose();
        }
    }, [capturedImage, onCapture, handleClose]);

    if (!mounted || !isOpen) return null;

    return createPortal(
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 h-[100dvh] bg-black z-[100] flex flex-col"
            >
                {/* Flash Animation */}
                <AnimatePresence>
                    {flash && (
                        <motion.div
                            initial={{ opacity: 0.8 }}
                            animate={{ opacity: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="absolute inset-0 bg-white z-[110] pointer-events-none"
                        />
                    )}
                </AnimatePresence>

                {/* Header */}
                <div className="flex items-center justify-between p-4 pt-safe-top z-[101] relative">
                    <button
                        onClick={handleClose}
                        className="p-2 rounded-full bg-black/20 text-white backdrop-blur-md border border-white/10 hover:bg-black/40 transition-colors"
                        aria-label="Close camera"
                    >
                        <X size={24} />
                    </button>
                    <h2 className="text-white font-medium text-lg drop-shadow-md">
                        {capturedImage ? 'Review Photo' : 'Take Photo'}
                    </h2>
                    <button
                        onClick={switchCamera}
                        className="p-2 rounded-full bg-black/20 text-white backdrop-blur-md border border-white/10 hover:bg-black/40 transition-colors disabled:opacity-0"
                        disabled={!!capturedImage || !isSupported}
                        aria-label="Switch camera"
                    >
                        <SwitchCamera size={24} />
                    </button>
                </div>

                {/* Camera View / Preview */}
                <div className="flex-1 relative overflow-hidden bg-black">
                    {/* Video element */}
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className={cn(
                            "absolute inset-0 w-full h-full object-cover",
                            // Only hide if we have a captured image, otherwise show (even if loading, it might just be black)
                            capturedImage ? "invisible" : "visible"
                        )}
                    />

                    {/* Error State */}
                    {error && (
                        <div className="absolute inset-0 flex items-center justify-center p-8 z-20 bg-black/80">
                            <div className="text-center">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                                    <Camera className="w-8 h-8 text-red-500" />
                                </div>
                                <p className="text-white/80 mb-4">{error}</p>
                                {isSupported && (
                                    <button
                                        onClick={startCamera}
                                        className="px-6 py-2 bg-white text-black rounded-full font-medium hover:bg-gray-100 transition-colors"
                                    >
                                        Try Again
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Loading State */}
                    {isLoading && !error && !capturedImage && (
                        <div className="absolute inset-0 flex items-center justify-center z-20">
                            <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                        </div>
                    )}

                    {/* Captured Image Preview */}
                    {capturedImage && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="absolute inset-0 z-10 bg-black"
                        >
                            <img
                                src={capturedImage}
                                alt="Captured"
                                className="w-full h-full object-contain"
                            />
                        </motion.div>
                    )}

                    {/* Hidden canvas for capture */}
                    <canvas ref={canvasRef} className="hidden" />

                    {/* Camera Guides (only in live view) */}
                    {!capturedImage && !error && !isLoading && (
                        <div className="absolute inset-0 pointer-events-none opacity-30">
                            <div className="absolute inset-x-0 top-1/3 h-px bg-white/50" />
                            <div className="absolute inset-x-0 top-2/3 h-px bg-white/50" />
                            <div className="absolute inset-y-0 left-1/3 w-px bg-white/50" />
                            <div className="absolute inset-y-0 right-1/3 w-px bg-white/50" />
                        </div>
                    )}
                </div>

                {/* Bottom Controls */}
                <div className="p-8 pb-safe-bottom bg-black z-[101]">
                    {capturedImage ? (
                        <div className="flex items-center justify-between max-w-xs mx-auto">
                            <motion.button
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                onClick={retakePhoto}
                                className="flex flex-col items-center gap-2 text-white/80 hover:text-white transition-colors"
                            >
                                <div className="p-4 rounded-full bg-white/10 border border-white/10">
                                    <RotateCcw size={24} />
                                </div>
                                <span className="text-sm font-medium">Retake</span>
                            </motion.button>

                            <motion.button
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.1 }}
                                onClick={confirmPhoto}
                                className="flex flex-col items-center gap-2 text-primary-foreground"
                            >
                                <div className="p-5 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors">
                                    <Check size={32} />
                                </div>
                                <span className="text-sm font-medium text-white">Use Photo</span>
                            </motion.button>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center">
                            <motion.button
                                onClick={capturePhoto}
                                disabled={isLoading || !!error || !isSupported}
                                className={cn(
                                    "w-20 h-20 rounded-full border-4 border-white flex items-center justify-center relative group",
                                    isLoading || error || !isSupported
                                        ? "opacity-50 cursor-not-allowed"
                                        : "cursor-pointer"
                                )}
                                whileTap={{ scale: 0.9 }}
                                aria-label="Take photo"
                            >
                                <div className="w-16 h-16 rounded-full bg-white transition-transform group-hover:scale-95" />
                            </motion.button>
                        </div>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>,
        document.body
    );
}
