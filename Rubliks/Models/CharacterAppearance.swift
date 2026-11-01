//
//  CharacterAppearance.swift
//  Rubliks
//

import SwiftUI

struct CharacterAppearance: Codable, Equatable {
    var faceIndex: Int
    var hairIndex: Int
    var topIndex: Int
    var bottomIndex: Int
    var shoesIndex: Int
    var accessoryIndex: Int
    var skinToneIndex: Int
    var name: String

    static let `default` = CharacterAppearance(
        faceIndex: 0, hairIndex: 0, topIndex: 0, bottomIndex: 0, shoesIndex: 0, accessoryIndex: 0, skinToneIndex: 0, name: ""
    )

    static let faceOptions = ["Круглое", "Овал", "Квадрат", "Сердечко", "Скулы"]
    static let hairOptions = ["Короткие", "Ёжик", "Каре", "Длинные", "Хвост", "Кудри"]
    static let topOptions = ["Синяя футболка", "Белая рубашка", "Пиджак", "Свитшот", "Поло"]
    static let bottomOptions = ["Джинсы", "Чёрные брюки", "Шорты", "Юбка", "Спортивные"]
    static let shoesOptions = ["Кроссовки", "Ботинки", "Кеды", "Туфли", "Сандалии"]
    static let accessoryOptions = ["Часы", "Очки", "Наушники", "Без аксессуаров"]
    static let skinToneOptions = ["Светлый", "Загорелый", "Смуглый"]

    private static let key = "characterAppearance"

    static func load() -> CharacterAppearance {
        guard let data = UserDefaults.standard.data(forKey: key) else { return .default }
        if let decoded = try? JSONDecoder().decode(CharacterAppearance.self, from: data) {
            var d = decoded
            d.faceIndex = max(0, min(d.faceIndex, faceOptions.count - 1))
            d.hairIndex = max(0, min(d.hairIndex, hairOptions.count - 1))
            d.topIndex = max(0, min(d.topIndex, topOptions.count - 1))
            d.bottomIndex = max(0, min(d.bottomIndex, bottomOptions.count - 1))
            d.shoesIndex = max(0, min(d.shoesIndex, shoesOptions.count - 1))
            d.accessoryIndex = max(0, min(d.accessoryIndex, accessoryOptions.count - 1))
            d.skinToneIndex = max(0, min(d.skinToneIndex, skinToneOptions.count - 1))
            return d
        }
        if let legacy = try? JSONDecoder().decode(CharacterAppearanceLegacy.self, from: data) {
            return CharacterAppearance(
                faceIndex: legacy.faceIndex,
                hairIndex: legacy.hairIndex,
                topIndex: legacy.topIndex,
                bottomIndex: legacy.bottomIndex,
                shoesIndex: legacy.shoesIndex,
                accessoryIndex: legacy.accessoryIndex,
                skinToneIndex: 0,
                name: legacy.name
            )
        }
        return .default
    }

    func save() {
        guard let data = try? JSONEncoder().encode(self) else { return }
        UserDefaults.standard.set(data, forKey: CharacterAppearance.key)
    }
}

private struct CharacterAppearanceLegacy: Codable {
    var faceIndex: Int
    var hairIndex: Int
    var topIndex: Int
    var bottomIndex: Int
    var shoesIndex: Int
    var accessoryIndex: Int
    var name: String
}
