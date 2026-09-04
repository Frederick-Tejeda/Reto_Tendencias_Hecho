// src/components/Counter.tsx
import { useState } from 'react';

export default function Counter() {
    const [count, setCount] = useState(0);

    return (
        <div style={{ padding: '1rem', border: '1px solid #ccc', borderRadius: '8px' }}>
            <p>Count: {count}</p>
            <button onClick={() => setCount(c => c + 1)}>Increment</button>
        </div>
    );
}