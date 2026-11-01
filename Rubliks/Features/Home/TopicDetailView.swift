//
//  TopicDetailView.swift
//  Rubliks
//

import SwiftUI

struct TopicDetailView: View {
    let topicId: String
    @State private var showPurchase = false

    private var content: (title: String, paragraphs: [String], facts: [String], canBuy: Bool) {
        switch topicId {
        case "crypto":
            return (
                "Криптовалюта",
                [
                    "Криптовалюта — это цифровые деньги, которые работают на технологии блокчейн. Эмиссия и учёт децентрализованы: нет одного центра (как ЦБ у рубля).",
                    "Зачем нужна: быстрые переводы без банков, возможность инвестировать в новый класс активов, прозрачность операций в сети.",
                    "Как работает: майнеры (или валидаторы) проверяют транзакции и добавляют их в блоки. За это получают вознаграждение. Криптовалюты можно покупать на биржах (Binance, Bybit и др.) или через брокера (например, через ETF).",
                    "Риски: высокая волатильность, мошенничество, регулирование может меняться. Вкладывайте только ту сумму, которую готовы потерять."
                ],
                [
                    "Первая криптовалюта — биткоин — появилась в 2009 году. Её создатель известен под псевдонимом Сатоси Накамото.",
                    "Всего в мире существуют тысячи криптовалют, но большая часть капитализации приходится на несколько десятков.",
                    "Блокчейн хранит историю всех транзакций: подделать запись практически невозможно без контроля над большей частью сети."
                ],
                true
            )
        case "futures":
            return (
                "Фьючерсы",
                [
                    "Фьючерс — это договор купить или продать актив в будущем по цене, зафиксированной сегодня. Активом может быть нефть, газ, индекс, валюта, акция.",
                    "Зачем нужны: хеджирование (страховка от падения или роста цены), спекуляции на движении цены без покупки самого актива.",
                    "Как работает: вы заключаете сделку с биржей. В день исполнения контракта происходит расчёт: разница между ценой контракта и фактической ценой перечисляется выигравшей стороне. Часто контракты закрывают до срока (продают обратно), не дожидаясь поставки.",
                    "Риски: плечо увеличивает и прибыль, и убытки. Новичкам лучше сначала осваивать акции и облигации."
                ],
                [
                    "Первые фьючерсные контракты заключали на рис в Японии ещё в XVII веке.",
                    "На Московской бирже торгуют фьючерсами на индекс РТС, нефть, газ, валюту и отдельные акции.",
                    "Фьючерс не означает, что вы получите бочку нефти домой — большинство контрактов расчётные: платится разница в цене."
                ],
                true
            )
        case "taxes":
            return (
                "Налоги",
                [
                    "С доходов от инвестиций в России платится НДФЛ — 13% (до 5 млн ₽ в год) или 15% (свыше).",
                    "Что облагается: доход от продажи акций, облигаций, валюты, дивиденды, купоны. Убытки можно учесть и уменьшить налог в следующих периодах.",
                    "Куда идёт: налоги формируют бюджет — медицина, образование, дороги, пенсии. Часть идёт в регионы.",
                    "Как платить: брокер может быть налоговым агентом (удерживает и переводит налог сам) или вы подаёте декларацию 3-НДФЛ и платите сами. ИИС даёт право на вычет или освобождение от НДФЛ по сделкам при соблюдении условий."
                ],
                [
                    "Индивидуальный инвестиционный счёт (ИИС) позволяет получить вычет до 52 000 ₽ в год или не платить НДФЛ с прибыли по сделкам.",
                    "Убытки по одним активам можно зачесть в счёт будущей прибыли — это называется перенос убытков.",
                    "Дивиденды российских компаний облагаются по той же ставке НДФЛ; налог часто удерживает брокер при выплате."
                ],
                false
            )
        case "stock":
            return (
                "Фондовый рынок",
                [
                    "Фондовый рынок — это место, где покупают и продают ценные бумаги: акции, облигации, ETF. В России основная площадка — Московская биржа (МОЕХ).",
                    "Акция — доля в компании. Если компания растёт и платит дивиденды, вы можете получать доход. Цена акции меняется из-за спроса и предложения, новостей, отчётности.",
                    "Как начать: открыть брокерский счёт (Сбер, Тинькофф, ВТБ и др.), пополнить счёт, выставлять заявки на покупку/продажу через приложение брокера.",
                    "«Акции становятся деньгами» в том смысле, что вы можете в любой момент продать их и получить рубли (ликвидность). Долгосрочное владение качественными компаниями исторически приносило доход выше инфляции."
                ],
                [
                    "На Московской бирже торгуются акции сотен российских компаний: от Сбербанка и Газпрома до молодых технологических компаний.",
                    "Цена акции не равна «цене компании»: капитализация = цена одной акции × количество акций в обращении.",
                    "Дивиденды — это часть прибыли компании, которую она может распределить между акционерами; не все компании их платят."
                ],
                true
            )
        default:
            return (
                topicId,
                ["Материал по этой теме готовится."],
                [],
                false
            )
        }
    }

    var body: some View {
        let data = content
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                // Основной материал
                VStack(alignment: .leading, spacing: 12) {
                    Text("Материал")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(Color(white: 0.5))
                    ForEach(Array(data.paragraphs.enumerated()), id: \.offset) { _, p in
                        Text(p)
                            .font(.system(size: 16, weight: .regular))
                            .foregroundColor(Color(white: 0.3))
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }

                // Интересные факты
                if !data.facts.isEmpty {
                    VStack(alignment: .leading, spacing: 10) {
                        HStack(spacing: 6) {
                            Image(systemName: "lightbulb.fill")
                                .font(.system(size: 14))
                                .foregroundColor(Color(red: 0.95, green: 0.75, blue: 0.2))
                            Text("Интересные факты")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundColor(Color(white: 0.4))
                        }
                        ForEach(Array(data.facts.enumerated()), id: \.offset) { _, f in
                            HStack(alignment: .top, spacing: 8) {
                                Text("•")
                                    .font(.system(size: 14))
                                    .foregroundColor(AppTheme.cardPurpleLight)
                                Text(f)
                                    .font(.system(size: 14, weight: .regular))
                                    .foregroundColor(Color(white: 0.35))
                            }
                        }
                    }
                    .padding(16)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(AppTheme.cardPurpleLight.opacity(0.12))
                    .cornerRadius(AppTheme.cornerRadiusSmall)
                }

                // Кнопка покупки
                if data.canBuy {
                    Button(action: { showPurchase = true }) {
                        HStack(spacing: 8) {
                            Image(systemName: "cart.fill.badge.plus")
                                .font(.system(size: 18))
                            Text(buyButtonTitle)
                                .font(.system(size: 16, weight: .bold))
                        }
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(AppTheme.accentRed)
                        .cornerRadius(AppTheme.buttonCornerRadius)
                    }
                    .padding(.top, 8)
                }

                if topicId == "stock" {
                    NavigationLink(value: TopicRoute.stocks) {
                        HStack(spacing: 8) {
                            Image(systemName: "list.bullet.rectangle")
                                .font(.system(size: 18))
                            Text("Смотреть акции")
                                .font(.system(size: 16, weight: .bold))
                        }
                        .foregroundColor(AppTheme.cardPurpleDark)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(Color.white)
                        .cornerRadius(AppTheme.buttonCornerRadius)
                        .overlay(RoundedRectangle(cornerRadius: AppTheme.buttonCornerRadius).stroke(AppTheme.cardPurpleLight, lineWidth: 1))
                    }
                    .padding(.top, 8)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(24)
        }
        .background(AppTheme.backgroundLightGray)
        .navigationTitle(data.title)
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $showPurchase) {
            PurchaseView(assetType: topicId, onComplete: nil)
        }
    }

    private var buyButtonTitle: String {
        switch topicId {
        case "crypto": return "Купить криптовалюту"
        case "futures": return "Купить фьючерсы"
        case "stock": return "Купить акции"
        default: return "Купить"
        }
    }
}
