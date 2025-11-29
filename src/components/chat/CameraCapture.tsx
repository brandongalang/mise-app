'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
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
                await videoRef.current.play();
            }
        } catch (err) {
            console.error('Camera error:', err);
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
        } finally {
            setIsLoading(false);
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
    }, [facingMode]); // eslint-disable-line react-hooks/exhaustive-deps -- intentionally only re-run on facingMode change

    // Capture photo
    const capturePhoto = useCallback(() => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        if (!ctx) return;

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

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-espresso/95 flex flex-col"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4">
                    <button
                        onClick={handleClose}
                        className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                        aria-label="Close camera"
                    >
                        <X size={24} />
                    </button>
                    <h2 className="text-white font-semibold">Take Photo</h2>
                    <button
                        onClick={switchCamera}
                        className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors disabled:opacity-50"
                        disabled={!!capturedImage || !isSupported}
                        aria-label="Switch camera"
                    >
                        <SwitchCamera size={24} />
                    </button>
                </div>

                {/* Camera View / Preview */}
                <div className="flex-1 relative overflow-hidden">
                    {error ? (
                        <div className="absolute inset-0 flex items-center justify-center p-8">
                            <div className="text-center">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-cayenne/20 flex items-center justify-center">
                                    <Camera className="w-8 h-8 text-cayenne" />
                                </div>
                                <p className="text-white/80 mb-4">{error}</p>
                                {isSupported && (
                                    <button
                                        onClick={startCamera}
                                        className="px-4 py-2 bg-terracotta text-white rounded-full hover:bg-terracotta-dark transition-colors"
                                    >
                                        Try Again
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : isLoading ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                        </div>
                    ) : capturedImage ? (
                        <motion.img
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            src={capturedImage}
                            alt="Captured"
                            className="absolute inset-0 w-full h-full object-contain"
                        />
                    ) : (
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="absolute inset-0 w-full h-full object-cover"
                        />
                    )}

                    {/* Hidden canvas for capture */}
                    <canvas ref={canvasRef} className="hidden" />

                    {/* Camera frame overlay */}
                    {!capturedImage && !error && !isLoading && (
                        <div className="absolute inset-8 border-2 border-white/30 rounded-2xl pointer-events-none">
                            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-xl" />
                            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-xl" />
                            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-xl" />
                            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-xl" />
                        </div>
                    )}
                </div>

                {/* Bottom Controls */}
                <div className="p-6 pb-safe-bottom">
                    {capturedImage ? (
                        <div className="flex items-center justify-center gap-8">
                            <motion.button
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                onClick={retakePhoto}
                                className="p-4 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                                aria-label="Retake photo"
                            >
                                <RotateCcw size={28} />
                            </motion.button>
                            <motion.button
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.1 }}
                                onClick={confirmPhoto}
                                className="p-5 rounded-full bg-sage text-white hover:bg-sage/90 transition-colors shadow-lg"
                                aria-label="Use this photo"
                            >
                                <Check size={32} />
                            </motion.button>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center">
                            <motion.button
                                onClick={capturePhoto}
                                disabled={isLoading || !!error || !isSupported}
                                className={cn(
                                    "w-20 h-20 rounded-full border-4 border-white flex items-center justify-center",
                                    "transition-all duration-200",
                                    isLoading || error || !isSupported
                                        ? "opacity-50"
                                        : "hover:scale-105 active:scale-95"
                                )}
                                whileTap={{ scale: 0.9 }}
                                aria-label="Take photo"
                            >
                                <div className="w-16 h-16 rounded-full bg-white" />
                            </motion.button>
                        </div>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
