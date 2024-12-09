import React from 'react';

type GalleryImage = {
  src: string;
  alt?: string;
  gridArea: string;  // Defines which area this image occupies
};

type GalleryProps = {
  images: GalleryImage[];
  gap?: number;
};

type GridLayout = {
    areas: string;
    columns: string;
    rows: string;
  };
  
const generateGridLayout = (imageCount: number): GridLayout => {
switch (imageCount) {
    case 2:
    return {
        areas: `
        "img1 img1 img2 img2"
        "img1 img1 img2 img2"
        `,
        columns: 'repeat(4, 1fr)',
        rows: 'repeat(2, 1fr)'
    };
    case 3:
    return {
        areas: `
        "img1 img1 img2 img2"
        "img1 img1 img3 img3"
        `,
        columns: 'repeat(4, 1fr)',
        rows: 'repeat(2, 1fr)'
    };
    case 4:
    return {
        areas: `
        "img1 img3 img2 img2"
        "img1 img3 img4 img4"
        `,
        columns: 'repeat(4, 1fr)',
        rows: 'repeat(2, 1fr)'
    };
    case 5:
    return {
        areas: `
        "img2 img2 img2 img2 img3 img3"
        "img2 img2 img2 img2 img3 img3"
        "img1 img1 img4 img4 img3 img3"
        "img1 img1 img4 img4 img5 img5"
        "img1 img1 img4 img4 img5 img5"
        `,
        columns: 'repeat(6, 1fr)',
        rows: 'repeat(5, 1fr)'
    };
    case 6:
    return {
        areas: `
        "img1 img1 img2 img3"
        "img4 img5 img5 img6"
        `,
        columns: 'repeat(4, 1fr)',
        rows: 'repeat(2, 1fr)'
    };
    case 7:
    return {
        areas: `
        "img1 img1 img2 img3 img3"
        "img4 img5 img6 img7 img3"
        `,
        columns: 'repeat(5, 1fr)',
        rows: 'repeat(2, 1fr)'
    };
    case 8:
    return {
        areas: `
        "img1 img1 img2 img3 img4"
        "img5 img6 img7 img7 img8"
        `,
        columns: 'repeat(5, 1fr)',
        rows: 'repeat(2, 1fr)'
    };
    
    case 10:
    return {
        areas: `
        "img1  img1  img1   img10  img10  img10  img2  img2  img2  img3  img3  img3"
        "img1  img1  img1   img10  img10  img10  img2  img2  img2  img3  img3  img3"
        "img8  img8  img8   img10  img10  img10  img2  img2  img2  img3  img3  img3"
        "img8  img8  img8   img10  img10  img10  img2  img2  img2  img3  img3  img3"
        "img8  img8  img8   img7   img7   img7   img2  img2  img2  img3  img3  img3"
        "img5  img5  img5   img7   img7   img7   img2  img2  img2  img3  img3  img3"
        "img6  img6  img6   img7   img7   img7   img2  img2  img2  img9  img9  img9"
        "img6  img6  img6   img7   img7   img7   img2  img2  img2  img9  img9  img9"
        "img4  img4  img4   img7   img7   img7   img2  img2  img2  img9  img9  img9"
        "img4  img4  img4   img7   img7   img7   img2  img2  img2  img9  img9  img9"
        `,
        columns: 'repeat(12, 1fr)',
        rows: 'repeat(10, 1fr)'
    };

    default:
    // For single image
    return {
        areas: `"img1"`,
        columns: '1fr',
        rows: '1fr'
    };
}
};

// Modified Gallery component to include loading and error states
const Gallery = ({ images, gap = 8 }: GalleryProps) => {
const layout = generateGridLayout(images.length);

return (
    <div 
    className="w-full aspect-[16/9]"
    style={{
        display: 'grid',
        gap: `${gap}px`,
        gridTemplateAreas: layout.areas,
        gridTemplateColumns: layout.columns,
        gridTemplateRows: layout.rows
    }}
    >
    {images.map((image, index) => (
        <div 
        key={index}
        className="relative overflow-hidden rounded-lg group"
        style={{ gridArea: `img${index + 1}` }}
        >
        {/* Image wrapper for consistent aspect ratio */}
        <div className="absolute inset-0">
            <img
            src={image.src}
            alt={image.alt || 'Gallery image'}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            />
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/30 opacity-75 group-hover:opacity-0 transition-opacity duration-300" />
        </div>
        </div>
    ))}
    </div>
);
};

export default Gallery;