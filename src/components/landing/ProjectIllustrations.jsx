import React from 'react';

import villa from '../../assets/projects/villa.jpg';
import tower from '../../assets/projects/tower.jpg';
import highway from '../../assets/projects/highway.jpg';
import land from '../../assets/projects/land.jpg';
import complex from '../../assets/projects/complex.jpg';
import bricks from '../../assets/projects/bricks.jpg';
import bank from '../../assets/projects/bank.jpg';
import crane from '../../assets/projects/crane.jpg';

/* ============================================================
 *  Project scene images
 *  ----------------------------------------------------------------
 *  Photos used inside the landing-page cards (FeaturedProjects +
 *  Arenas). Bundled as local assets so the page renders without
 *  hitting an external CDN.
 *
 *  Source: Unsplash (free for commercial use, no attribution
 *  required per the Unsplash License). The original page URLs
 *  are tracked in the commit that added these files.
 *
 *  Usage:
 *    <Illustration name="villa" />
 *
 *  Unknown names fall through to a soft gradient placeholder.
 * ============================================================ */

const IMAGES = {
  villa,       // residential / سكني
  tower,       // commercial / تجاري
  highway,     // infrastructure / بنية تحتية
  land,        // land plot / أرض تطوير
  complex,     // commercial complex / مجمع
  bricks,      // building materials / مواد بناء
  bank,        // financed / تمويل
  crane,       // construction crane / تحالف
};

export default function Illustration({ name, className, style }) {
  const src = IMAGES[name];

  if (!src) {
    return (
      <div
        className={className}
        style={{
          width: '100%',
          height: '100%',
          background:
            'linear-gradient(135deg, rgba(255,255,255,0.5), rgba(255,255,255,0.1))',
          ...style,
        }}
      />
    );
  }

  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
      className={className}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        display: 'block',
        ...style,
      }}
    />
  );
}
