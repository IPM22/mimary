"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { CheckCircle, MessageCircle, ShoppingBag, Plus, Minus, X } from "lucide-react";

type ProductInfo = {
  id: string;
  name: string;
  images: string[];
  category: string | null;
  subcategory: string | null;
  description: string | null;
  benefits: string | null;
  howToUse: string | null;
  howItWorks: string | null;
  generalInfo: string | null;
  ingredients: string | null;
};

type CatalogItem = {
  product: ProductInfo;
  price: number | null;
};

type CartItem = {
  productId: string;
  name: string;
  image: string | null;
  price: number | null;
  quantity: number;
};

interface Props {
  consultant: { id: string; name: string; avatar: string | null; phone: string | null };
  mainProduct: ProductInfo;
  mainProductPrice: number | null;
  catalogItems: CatalogItem[];
}

function fmt(price: number) {
  return `RD$${price.toLocaleString("es-DO", { minimumFractionDigits: 0 })}`;
}

function waUrl(phone: string, consultantName: string, clientName: string, items: CartItem[]) {
  const digits = phone.replace(/\D/g, "");
  const e164 = /^(809|829|849)/.test(digits) ? "1" + digits : digits;
  const list = items.map((i) => `${i.quantity}x ${i.name}`).join(", ");
  const text = `Hola ${consultantName}, acabo de solicitar a través de MiMary: ${list}. Soy ${clientName}.`;
  return `https://wa.me/${e164}?text=${encodeURIComponent(text)}`;
}

export function PublicRequestForm({ consultant, mainProduct, mainProductPrice, catalogItems }: Props) {
  const [activeImg, setActiveImg] = useState(0);
  const [cart, setCart] = useState<CartItem[]>([
    {
      productId: mainProduct.id,
      name: mainProduct.name,
      image: mainProduct.images[0] ?? null,
      price: mainProductPrice,
      quantity: 1,
    },
  ]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submit = trpc.publicLinks.submitRequest.useMutation({
    onSuccess: () => setSubmitted(true),
  });

  function addToCart(item: CatalogItem) {
    setCart((prev) => {
      const exists = prev.find((c) => c.productId === item.product.id);
      if (exists) return prev.map((c) => c.productId === item.product.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { productId: item.product.id, name: item.product.name, image: item.product.images[0] ?? null, price: item.price, quantity: 1 }];
    });
  }

  function updateQty(productId: string, delta: number) {
    setCart((prev) =>
      prev.map((c) => c.productId === productId ? { ...c, quantity: c.quantity + delta } : c)
          .filter((c) => c.quantity > 0)
    );
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((c) => c.productId !== productId));
  }

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const cartTotal = cart.reduce((s, i) => (i.price ? s + i.price * i.quantity : s), 0);
  const allPriced = cart.every((i) => i.price !== null) && cartTotal > 0;

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-50 flex flex-col items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-8 shadow-xl max-w-sm w-full text-center space-y-5">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle size={40} className="text-green-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">¡Solicitud enviada!</h2>
            <p className="text-gray-500 text-sm mt-1">
              {consultant.name} te contactará pronto.
            </p>
          </div>
          <div className="bg-gray-50 rounded-2xl p-4 text-left space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Tu pedido</p>
            {cart.map((item) => (
              <div key={item.productId} className="flex justify-between items-center text-sm">
                <span className="text-gray-700">{item.quantity}× {item.name}</span>
                {item.price && <span className="font-semibold text-mk-pink">{fmt(item.price * item.quantity)}</span>}
              </div>
            ))}
            {allPriced && (
              <div className="flex justify-between items-center text-sm font-bold pt-2 border-t border-gray-200">
                <span>Total</span>
                <span className="text-mk-pink">{fmt(cartTotal)}</span>
              </div>
            )}
          </div>
          {consultant.phone && (
            <a
              href={waUrl(consultant.phone, consultant.name, name, cart)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-4 bg-[#25D366] hover:bg-[#1ebe5d] text-white font-bold rounded-2xl text-base shadow-lg transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Escribir por WhatsApp
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-50">
      {/* Header */}
      <div className="mk-gradient px-5 py-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl overflow-hidden bg-white/20 flex items-center justify-center flex-shrink-0">
          <img src="/logo.png" alt="MiMary" className="w-full h-full object-contain" />
        </div>
        <div>
          <p className="text-white font-bold text-sm leading-tight">MiMary</p>
          <p className="text-white/75 text-xs">Tienda de {consultant.name}</p>
        </div>
        {consultant.phone && (
          <a
            href={`https://wa.me/${consultant.phone.replace(/\D/g, "").replace(/^(809|829|849)/, "1$&")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 py-1.5 rounded-full transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Contactar
          </a>
        )}
      </div>

      <div className="max-w-lg mx-auto">
        {/* Galería */}
        <div className="bg-white">
          {mainProduct.images.length > 0 ? (
            <>
              <div className="aspect-square overflow-hidden bg-gray-50">
                <img
                  src={mainProduct.images[activeImg]}
                  alt={mainProduct.name}
                  className="w-full h-full object-contain"
                />
              </div>
              {mainProduct.images.length > 1 && (
                <div className="flex gap-2 px-4 py-3 overflow-x-auto">
                  {mainProduct.images.slice(0, 6).map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImg(i)}
                      className={`w-14 h-14 flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all ${
                        i === activeImg ? "border-mk-pink scale-105" : "border-transparent opacity-60"
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="aspect-square flex items-center justify-center bg-gray-50 text-gray-200 text-8xl">📦</div>
          )}
        </div>

        <div className="px-4 pt-5 pb-10 space-y-5">
          {/* Info del producto */}
          <div>
            {(mainProduct.category || mainProduct.subcategory) && (
              <p className="text-xs font-semibold text-mk-pink uppercase tracking-wider">
                {mainProduct.category}{mainProduct.subcategory ? ` · ${mainProduct.subcategory}` : ""}
              </p>
            )}
            <h1 className="text-2xl font-bold text-gray-900 mt-1 leading-tight">{mainProduct.name}</h1>
            {mainProductPrice && (
              <p className="text-3xl font-bold text-mk-pink mt-2">{fmt(mainProductPrice)}</p>
            )}
          </div>

          {mainProduct.description && (
            <p className="text-gray-600 text-sm leading-relaxed">{mainProduct.description}</p>
          )}

          {mainProduct.benefits && (
            <div className="bg-mk-pink-light rounded-2xl p-4">
              <p className="text-xs font-bold text-mk-pink uppercase tracking-wide mb-1">Ingredientes clave</p>
              <p className="text-sm text-gray-700 leading-relaxed">{mainProduct.benefits}</p>
            </div>
          )}

          {mainProduct.howToUse && (
            <div className="bg-amber-50 rounded-2xl p-4">
              <p className="text-xs font-bold text-mk-gold uppercase tracking-wide mb-1">Cómo aplicar</p>
              <p className="text-sm text-gray-700 leading-relaxed">{mainProduct.howToUse}</p>
            </div>
          )}

          {mainProduct.howItWorks && (
            <div className="bg-mk-gold-light rounded-2xl p-4">
              <p className="text-xs font-bold text-mk-gold uppercase tracking-wide mb-1">Cómo funciona</p>
              <p className="text-sm text-gray-700 leading-relaxed">{mainProduct.howItWorks}</p>
            </div>
          )}

          {mainProduct.ingredients && (
            <details className="bg-gray-50 rounded-2xl p-4 cursor-pointer">
              <summary className="text-sm font-semibold text-gray-700">Lista completa de ingredientes</summary>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">{mainProduct.ingredients}</p>
            </details>
          )}

          {/* Más productos */}
          {catalogItems.length > 0 && (
            <div>
              <h2 className="text-base font-bold text-gray-900 mb-3">Más productos disponibles</h2>
              <div className="grid grid-cols-2 gap-3">
                {catalogItems.map(({ product, price }) => {
                  const inCart = cart.find((c) => c.productId === product.id);
                  return (
                    <div key={product.id} className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100">
                      <div className="aspect-square rounded-xl overflow-hidden bg-gray-50 mb-2">
                        {product.images[0] ? (
                          <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-200 text-3xl">📦</div>
                        )}
                      </div>
                      {product.category && <p className="text-[10px] text-gray-400 truncate">{product.category}</p>}
                      <p className="text-sm font-semibold text-gray-900 leading-tight line-clamp-2 mt-0.5">{product.name}</p>
                      {price && <p className="text-sm font-bold text-mk-pink mt-1">{fmt(price)}</p>}
                      {inCart ? (
                        <div className="flex items-center justify-between mt-2 gap-1">
                          <button onClick={() => updateQty(product.id, -1)} className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
                            <Minus size={13} />
                          </button>
                          <span className="text-sm font-bold text-gray-900">{inCart.quantity}</span>
                          <button onClick={() => updateQty(product.id, 1)} className="w-7 h-7 rounded-full mk-gradient flex items-center justify-center">
                            <Plus size={13} className="text-white" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart({ product, price })}
                          className="mt-2 w-full py-2 mk-gradient text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1 hover:opacity-90 transition-opacity"
                        >
                          <Plus size={12} /> Agregar
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Carrito */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              <ShoppingBag size={16} className="text-mk-pink" />
              <span className="font-bold text-gray-900 text-sm">Tu pedido</span>
              <span className="ml-auto bg-mk-pink text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            </div>
            <div className="divide-y divide-gray-50">
              {cart.map((item) => (
                <div key={item.productId} className="px-4 py-3 flex items-center gap-3">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                    {item.price && (
                      <p className="text-xs text-mk-pink font-semibold">{fmt(item.price * item.quantity)}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => updateQty(item.productId, -1)} className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
                      <Minus size={11} />
                    </button>
                    <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                    <button onClick={() => updateQty(item.productId, 1)} className="w-6 h-6 rounded-full mk-gradient flex items-center justify-center">
                      <Plus size={11} className="text-white" />
                    </button>
                    {item.productId !== mainProduct.id && (
                      <button onClick={() => removeFromCart(item.productId)} className="w-6 h-6 rounded-full bg-red-50 hover:bg-red-100 flex items-center justify-center ml-0.5 transition-colors">
                        <X size={11} className="text-red-400" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {allPriced && (
              <div className="px-4 py-3 bg-mk-pink-light flex justify-between items-center">
                <span className="text-sm text-gray-600 font-medium">Total estimado</span>
                <span className="text-lg font-bold text-mk-pink">{fmt(cartTotal)}</span>
              </div>
            )}
          </div>

          {/* Formulario */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 mk-gradient rounded-xl flex items-center justify-center flex-shrink-0">
                <MessageCircle size={17} className="text-white" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900 text-sm">Completa tu solicitud</h2>
                <p className="text-xs text-gray-400">{consultant.name} te contactará pronto</p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Tu nombre *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="¿Cómo te llamas?"
                className="mt-1 w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-mk-pink/30"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">WhatsApp / Teléfono</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                type="tel"
                placeholder="Ej: 809-555-1234"
                className="mt-1 w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-mk-pink/30"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Mensaje (opcional)</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={2}
                placeholder="¿Alguna pregunta sobre los productos?"
                className="mt-1 w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-mk-pink/30 resize-none"
              />
            </div>

            {submit.error && <p className="text-red-500 text-sm">{submit.error.message}</p>}

            <button
              onClick={() =>
                submit.mutate({
                  consultantId: consultant.id,
                  clientName: name,
                  clientPhone: phone || undefined,
                  message: message || undefined,
                  items: cart.map((item) => ({ productId: item.productId, quantity: item.quantity })),
                })
              }
              disabled={!name.trim() || cart.length === 0 || submit.isPending}
              className="w-full py-4 mk-gradient text-white font-bold rounded-2xl text-base shadow-lg hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {submit.isPending
                ? "Enviando..."
                : `💌 Enviar solicitud${cartCount > 1 ? ` (${cartCount} productos)` : ""}`}
            </button>
          </div>

          {/* Consultora */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full mk-gradient flex items-center justify-center flex-shrink-0 overflow-hidden">
              {consultant.avatar ? (
                <img src={consultant.avatar} alt={consultant.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-bold text-xl">{consultant.name[0]}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-400">Tu consultora Mary Kay</p>
              <p className="font-bold text-gray-900">{consultant.name}</p>
            </div>
            {consultant.phone && (
              <a
                href={`https://wa.me/${consultant.phone.replace(/\D/g, "").replace(/^(809|829|849)/, "1$&")}?text=${encodeURIComponent(`Hola ${consultant.name}, vi tu tienda en MiMary y quiero más información.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-11 h-11 bg-[#25D366] hover:bg-[#1ebe5d] rounded-full flex items-center justify-center flex-shrink-0 transition-colors shadow-sm"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
