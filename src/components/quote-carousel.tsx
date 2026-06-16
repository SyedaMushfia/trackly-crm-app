"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const quotes = [
  {
    text: "Make a customer, not a sale.",
    author: "Katherine Barchetti",
  },
  {
    text: "A brand is no longer what we tell the customer it is — it is what customers tell each other it is.",
    author: "Scott Cook",
  },
  {
    text: "Every contact we have with a customer influences whether or not they’ll come back.",
    author: "Kevin Stirtz",
  },
  {
    text: "The purpose of business is to create and keep a customer.",
    author: "Peter Drucker",
  },
  {
    text: "Customer experience is the next competitive battleground.",
    author: "Jerry Gregoire",
  },
];

export function QuoteCarousel() {
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimating(true);
      setTimeout(() => {
        setCurrent((prev) => (prev + 1) % quotes.length);
        setAnimating(false);
      }, 400);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col h-full w-76">
      {/* Quote */}
      <div className="flex-1 flex flex-col justify-start ml-10 mt-5">
        <div
          className={cn(
            "transition-all duration-400",
            animating
              ? "opacity-0 translate-y-2"
              : "opacity-100 translate-y-0"
          )}
        >
          <div className="text-9xl text-white/30 font-serif leading-none">
            &ldquo;
          </div>
          <p className="text-white text-xl font-medium leading-relaxed -mt-10">
            {quotes[current].text}
          </p>
          <p className="text-white/50 text-sm mt-6 font-medium">
            — {quotes[current].author}
          </p>
        </div>
      </div>

      {/* Dots */}
      <div className="flex items-center gap-2 pt-8">
        {quotes.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              setAnimating(true);
              setTimeout(() => {
                setCurrent(i);
                setAnimating(false);
              }, 400);
            }}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              i === current
                ? "w-6 bg-card"
                : "w-1.5 bg-card/30 hover:bg-card/50"
            )}
          />
        ))}
      </div>
    </div>
  );
}