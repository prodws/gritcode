import { useState, useEffect } from 'react';

const FRAMES = ['/', '—', '\\', '|'];

const Spinner = () => {
    const [frame, setFrame] = useState(0);

    useEffect(() => {
        const id = setInterval(() => setFrame(f => (f + 1) % FRAMES.length), 120);
        return () => clearInterval(id);
    }, []);

    return (
        <div className="spinner">
            {FRAMES[frame]}
        </div>
    );
};

export default Spinner;
