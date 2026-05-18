const KONAMI_CODE = [
  'ArrowUp', 'ArrowUp',
  'ArrowDown', 'ArrowDown',
  'ArrowLeft', 'ArrowRight',
  'ArrowLeft', 'ArrowRight',
  'i', 'l', 'u',
] as const;

export function useKonamiCode(): boolean {
  const index = useRef(0);
  const [triggered, setTriggered] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== KONAMI_CODE[index.current]) {
        index.current = 0;
        return;
      }
      index.current++;
      if (index.current === KONAMI_CODE.length) {
        setTriggered(true);
        index.current = 0;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return triggered;
}
