import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createPasswordHash } from "../src/lib/password";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.adminUser.upsert({
    where: {
      username: "ADMIN_ZAIM",
    },
    update: {
      role: "BOSS",
      isActive: true,
    },
    create: {
      username: "ADMIN_ZAIM",
      passwordHash: createPasswordHash("admin123"),
      role: "BOSS",
      permissions: ["analytics", "admin_users"],
      isActive: true,
    },
  });

  const offers = [
    {
      slug: "zaymer",
      brandName: "Займер",
      legalName: "ПАО МФК «Займер»",
      logoText: "З",
      badge: "0% для новых клиентов",
      rating: "4.87",
      reviewsCount: 136,
      minAmount: 2000,
      maxAmount: 30000,
      minTermDays: 7,
      maxTermDays: 30,
      dailyRateFrom: "0",
      dailyRateTo: "0.8",
      pskFrom: "0",
      pskTo: "292",
      approvalLabel: "Высокая",
      approvalTone: "HIGH" as const,
      decisionTime: "5 минут",
      payoutMethods: ["карта", "онлайн"],
      repaymentMethods: ["карта", "перевод"],
      requirements: ["гражданство РФ", "возраст от 18 лет", "паспорт РФ"],
      documents: ["паспорт РФ"],
      advantages: ["первый заем под 0%", "быстрое решение", "полностью онлайн"],
      warnings: ["решение о выдаче принимает МФО"],
      trackingBaseUrl: "https://example.com/zaymer",
    },
    {
      slug: "bistrodengi",
      brandName: "Быстроденьги",
      legalName: "ООО МКК «Быстроденьги»",
      logoText: "Б",
      badge: "срочное рассмотрение",
      rating: "5.0",
      reviewsCount: 28,
      minAmount: 1000,
      maxAmount: 100000,
      minTermDays: 3,
      maxTermDays: 180,
      dailyRateFrom: "0",
      dailyRateTo: "0.8",
      pskFrom: "0",
      pskTo: "292",
      approvalLabel: "Высокая",
      approvalTone: "HIGH" as const,
      decisionTime: "20 минут",
      payoutMethods: ["карта", "наличные", "онлайн"],
      repaymentMethods: ["карта", "наличные", "перевод"],
      requirements: ["гражданство РФ", "возраст от 18 лет"],
      documents: ["паспорт РФ"],
      advantages: ["наличные или карта", "срочное рассмотрение"],
      warnings: ["перед оформлением проверьте полную стоимость займа"],
      trackingBaseUrl: "https://example.com/bistrodengi",
    },
    {
      slug: "moneyman",
      brandName: "MoneyMan",
      legalName: "ООО МФК «Мани Мен»",
      logoText: "M",
      badge: "старт бесплатно",
      rating: "4.9",
      reviewsCount: 52,
      minAmount: 1500,
      maxAmount: 100000,
      minTermDays: 5,
      maxTermDays: 180,
      dailyRateFrom: "0",
      dailyRateTo: "0.8",
      pskFrom: "281",
      pskTo: "292",
      approvalLabel: "Средняя",
      approvalTone: "MEDIUM" as const,
      decisionTime: "10 минут",
      payoutMethods: ["карта", "онлайн"],
      repaymentMethods: ["карта", "перевод"],
      requirements: ["гражданство РФ", "возраст от 18 лет"],
      documents: ["паспорт РФ"],
      advantages: ["длинный срок", "онлайн оформление"],
      warnings: ["одобрение не гарантируется"],
      trackingBaseUrl: "https://example.com/moneyman",
    },
  ];
  const seoPages = [
    {
      slug: "zaimy-na-kartu",
      title: "Займы на карту онлайн — ZaimKarta",
      description:
        "Подбор предложений МФО с получением денег на банковскую карту. Сравните сумму, срок, ставку и условия перед переходом к заявке.",
      h1: "Займы на карту онлайн",
      intro:
        "Подбор предложений МФО с получением денег на банковскую карту. Сравните сумму, срок, ставку и условия перед переходом к заявке.",
    },
    {
      slug: "srochnye-zaimy",
      title: "Срочные займы онлайн — ZaimKarta",
      description:
        "Предложения для ситуаций, когда деньги нужны быстро. Решение принимает МФО, поэтому важно заранее проверить условия и полную стоимость займа.",
      h1: "Срочные займы онлайн",
      intro:
        "Предложения для ситуаций, когда деньги нужны быстро. Решение принимает МФО, поэтому важно заранее проверить условия и полную стоимость займа.",
    },
    {
      slug: "zaimy-0-procentov",
      title: "Займы под 0 процентов — ZaimKarta",
      description:
        "Подборка предложений, где для новых клиентов может действовать ставка 0% при соблюдении условий договора.",
      h1: "Займы под 0 процентов",
      intro:
        "Подборка предложений, где для новых клиентов может действовать ставка 0% при соблюдении условий договора.",
    },
    {
      slug: "zaimy-novym-klientam",
      title: "Займы новым клиентам — ZaimKarta",
      description:
        "Предложения МФО для первой заявки: акции, лимиты, сроки и требования к заемщику.",
      h1: "Займы новым клиентам",
      intro:
        "Предложения МФО для первой заявки: акции, лимиты, сроки и требования к заемщику.",
    },
    {
      slug: "zaimy-s-plohoy-kreditnoy-istoriey",
      title: "Займы с плохой кредитной историей — ZaimKarta",
      description:
        "Варианты для заемщиков с разной кредитной историей. Одобрение не гарантируется и зависит от проверки конкретной МФО.",
      h1: "Займы с плохой кредитной историей",
      intro:
        "Варианты для заемщиков с разной кредитной историей. Одобрение не гарантируется и зависит от проверки конкретной МФО.",
    },
    {
      slug: "zaimy-bez-otkaza",
      title: "Займы с высокой вероятностью одобрения — ZaimKarta",
      description:
        "Подборка МФО, которые могут рассматривать заявки от разных категорий заемщиков. Мы не обещаем гарантированное одобрение.",
      h1: "Займы с высокой вероятностью одобрения",
      intro:
        "Подборка МФО, которые могут рассматривать заявки от разных категорий заемщиков. Мы не обещаем гарантированное одобрение.",
    },
  ];

  for (const item of offers) {
    const { trackingBaseUrl, ...offer } = item;

    const savedOffer = await prisma.offer.upsert({
      where: { slug: offer.slug },
      update: {
        ...offer,
        status: "ACTIVE",
      },
      create: {
        ...offer,
        status: "ACTIVE",
      },
    });

    await prisma.affiliateOffer.upsert({
      where: {
        id: `${savedOffer.slug}-demo-affiliate`,
      },
      update: {
        trackingBaseUrl,
        isActive: true,
      },
      create: {
        id: `${savedOffer.slug}-demo-affiliate`,
        offerId: savedOffer.id,
        network: "OTHER",
        targetAction: "выдача займа",
        currency: "RUB",
        geoIncluded: ["РФ"],
        allowedTrafficTypes: ["SEO"],
        forbiddenTrafficTypes: ["мотивированный трафик", "спам", "дорвейный трафик"],
        trackingBaseUrl,
        isActive: true,
      },
    });
  }

  const activeOffers = await prisma.offer.findMany({
    where: {
      status: "ACTIVE",
    },
    orderBy: [{ displayPriority: "asc" }, { brandName: "asc" }],
  });

  for (const page of seoPages) {
    const savedPage = await prisma.seoPage.upsert({
      where: {
        slug: page.slug,
      },
      update: {
        ...page,
        status: "PUBLISHED",
        pageType: "CATEGORY",
        riskNotice:
          "Решение о выдаче займа принимает МФО. Перед оформлением проверьте полную стоимость займа, срок, ставку и условия договора.",
        updatedByUserAt: new Date(),
      },
      create: {
        ...page,
        status: "PUBLISHED",
        pageType: "CATEGORY",
        riskNotice:
          "Решение о выдаче займа принимает МФО. Перед оформлением проверьте полную стоимость займа, срок, ставку и условия договора.",
        publishedAt: new Date(),
        updatedByUserAt: new Date(),
      },
    });

    await prisma.seoPageFaqItem.deleteMany({
      where: {
        seoPageId: savedPage.id,
      },
    });

    await prisma.seoPageFaqItem.createMany({
      data: [
        {
          seoPageId: savedPage.id,
          question: "ZaimKarta сама выдает займы?",
          answer:
            "Нет. ZaimKarta показывает выбранные предложения МФО и ведет пользователя на сайт партнера для оформления заявки.",
          position: 1,
        },
        {
          seoPageId: savedPage.id,
          question: "Одобрение по заявке гарантировано?",
          answer:
            "Нет. Решение принимает конкретная МФО после проверки анкеты и документов заемщика.",
          position: 2,
        },
      ],
    });

    await prisma.seoPageOffer.deleteMany({
      where: {
        seoPageId: savedPage.id,
      },
    });

    if (activeOffers.length > 0) {
      await prisma.seoPageOffer.createMany({
        data: activeOffers.map((offer, index) => ({
          seoPageId: savedPage.id,
          offerId: offer.id,
          position: index + 1,
        })),
      });
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
