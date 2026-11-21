import { Carousel, CarouselSlide } from '../../src';

const banners = [
  { title: '출고 마감 시간 안내', description: '오후 3시까지 결제된 주문은 당일 출고합니다.' },
  { title: '이번 달 프로모션', description: '사업장별 배너와 행사 기간을 확인하세요.' },
  { title: '신규 입고 상품', description: '이번 주 입고된 상품의 재고와 판매가를 확인하세요.' },
];

export function CarouselExample() {
  return <Carousel label="사업장 운영 안내">
    {banners.map(banner => <CarouselSlide key={banner.title}>
      <div className="flex min-h-40 flex-col justify-center gap-3 bg-sunken p-4">
        <h3 className="text-[length:var(--text-title-sm)] font-semibold">{banner.title}</h3>
        <p>{banner.description}</p>
      </div>
    </CarouselSlide>)}
  </Carousel>;
}
