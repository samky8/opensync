'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowRight, Star } from 'lucide-react';
import { Button } from './ui/button';
import styles from './hours-review-slideshow.module.css';

const reviews = [
  {
    initial: 'H',
    colour: '#526d7b',
    rating: 2,
    excerpt:
      'The other FOUR times we visited they were CLOSED despite their website saying they were open.',
  },
  {
    initial: 'A',
    colour: '#227363',
    rating: 1,
    paraphrased: true,
    excerpt: 'Google said they were open, but they were closed when I got there.',
  },
  {
    initial: 'D',
    colour: '#ac482b',
    rating: 1,
    excerpt:
      'Showed up at 6:10 with 24 people in front of us and after waiting in line for 5 mins she came out and informed us they were closed despite the web site saying they were open until 6:30.',
  },
  {
    initial: 'N',
    colour: '#205faf',
    rating: 1,
    excerpt:
      'I’ve tried to come here for lunch 3 times and it’s always closed despite saying it’s open on Google.',
  },
  {
    initial: 'M',
    colour: '#7651a8',
    rating: 3,
    fictional: true,
    excerpt:
      'The website said they were open until 7, so I drove over after work. There was a sign on the door saying they’d closed early. I’ll call ahead next time.',
  },
];

export function HoursReviewSlideshow() {
  const [current, setCurrent] = useState(0);

  function moveReview(offset: number) {
    setCurrent((index) => (index + offset + reviews.length) % reviews.length);
  }

  return (
    <div
      className={styles.card}
      role="group"
      aria-roledescription="carousel"
      aria-label="Customer reviews"
    >
      <div className={styles.slides} aria-live="polite" aria-atomic="true">
        {reviews.map(({ initial, colour, rating, excerpt, fictional, paraphrased }, index) => (
          <div className={styles.slide} key={initial} aria-hidden={index !== current}>
            <div className={styles.meta}>
              <span
                className={styles.avatar}
                style={{ backgroundColor: colour }}
                aria-hidden="true"
              >
                {initial}
              </span>
              <div>
                <strong>Reviewer {initial}</strong>
                {!fictional && (
                  <span>
                    {paraphrased ? 'Google review (paraphrased)' : 'Google review excerpt'}
                  </span>
                )}
              </div>
            </div>
            <div className={styles.rating} role="img" aria-label={`${rating} out of 5 stars`}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={star <= rating ? styles.filledStar : undefined}
                  size={16}
                  fill="currentColor"
                  strokeWidth={0}
                  aria-hidden="true"
                />
              ))}
            </div>
            <blockquote>{excerpt}</blockquote>
          </div>
        ))}
      </div>
      <div className={styles.controls}>
        <span className={styles.position}>
          {current + 1} / {reviews.length}
        </span>
        <div className={styles.arrows}>
          <Button
            type="button"
            variant="outline"
            aria-label="Previous review"
            onClick={() => moveReview(-1)}
          >
            <ArrowLeft size={17} aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="outline"
            aria-label="Next review"
            onClick={() => moveReview(1)}
          >
            <ArrowRight size={17} aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}
