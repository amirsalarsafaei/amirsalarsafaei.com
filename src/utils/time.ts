export function formatTime(date: Date): string {
    // Extract hours, minutes, and seconds
    const hours: number = date.getHours();
    const minutes: number = date.getMinutes();
    const seconds: number = date.getSeconds();

    // Pad with leading zeroes if necessary
    const paddedHours: string = hours.toString().padStart(2, '0');
    const paddedMinutes: string = minutes.toString().padStart(2, '0');
    const paddedSeconds: string = seconds.toString().padStart(2, '0');

    // Concatenate into HH:MM:SS format
    return `${paddedHours}:${paddedMinutes}:${paddedSeconds}`;
}
