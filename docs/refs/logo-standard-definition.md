# 📐 Definição Padrão do Logo W - Widia.io

## Geometria Oficial do W

O logo "W" da Widia.io segue uma geometria específica que deve ser mantida consistente em todas as aplicações:

### Path SVG Padrão
```svg
<path d="M10 12L14 28L20 16L26 28L30 12" 
      stroke="white" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      fill="none"/>
```

### Estrutura Visual
```
    10,12              30,12
      \                /
       \              /
        \            /
         \          /
        14,28    26,28
           \    /
            \  /
           20,16
```

### Características
- **2 picos**: Design limpo com apenas dois picos principais
- **Ponto central**: Valle central em Y=16 (mais alto que os vales laterais)
- **Vales laterais**: Em Y=28 (pontos mais baixos)
- **Largura total**: 20 unidades (de X=10 a X=30)
- **Altura total**: 16 unidades (de Y=12 a Y=28)

### Container
- **Viewbox**: 40x40 unidades
- **Background**: Quadrado preto com border-radius de 8 unidades (20% do tamanho)
- **Cor do fundo**: #000000 (preto puro)
- **Cor do traço**: #FFFFFF (branco puro)

## Proporções para Diferentes Tamanhos

### Viewbox 100x100 (Ícone grande)
```svg
<path d="M20 30L28 65L40 40L50 60L60 40L72 65L80 30"/>
```

### Viewbox 200x200 (Banner/Hero)
```svg
<path d="M40 60L56 130L80 80L100 120L120 80L144 130L160 60"/>
```

## Regra de Escalonamento
Para adaptar o W a diferentes tamanhos, use a fórmula:
- X' = X * (novo_viewbox / 40)
- Y' = Y * (novo_viewbox / 40)

## ⚠️ NÃO USAR
Designs antigos com múltiplas ondas como:
- ❌ `M8 12L12 28L16 12L20 28L24 12L28 28L32 12` (3+ picos)
- ❌ Variações com proporções diferentes
- ❌ Versões com gradientes ou múltiplas cores

## ✅ Implementação Correta
Sempre use o path padrão definido acima, ajustando apenas o escalonamento conforme necessário.

---
*Este é o padrão oficial do logo W da Widia.io - Janeiro 2025*