import { Injectable } from '@angular/core';
import { BehaviorSubject, from } from 'rxjs';
import { map, take } from 'rxjs/operators';
import * as Market from 'slpdex-market';

@Injectable({
  providedIn: 'root',
})
export class MarketService {
  private marketToken$ = new BehaviorSubject<Market.MarketToken>(null);
  private marketTokenRef: Market.MarketToken;

  private marketOverview$ = new BehaviorSubject<Market.TokenOverview[]>([]);

  private marketOverviewToken$ = new BehaviorSubject<Market.TokenOverview>(
    null,
  );

  constructor() {}

  get marketToken() {
    return this.marketToken$.asObservable();
  }

  get marketOverview() {
    return this.marketOverview$.asObservable();
  }

  get marketOverviewToken() {
    return this.marketOverviewToken$.asObservable();
  }

  loadMarketOverviewToken = (tokenId: string) => {
    this.marketOverviewToken$.next(null);

    this.loadMarketOverviewQuery()
      .pipe(
        take(1),
        map(overview => overview.searchTokens(tokenId).toArray()),
      )
      .subscribe(overview => {
        this.marketOverviewToken$.next(overview[0]);
      });
  };

  loadMarketOverview = (
    sortByKey: Market.TokenSortByKey,
    ascending: boolean,
    search: string = undefined,
  ) => {
    if (search) {
      this.loadMarketOverviewSearch(search);
      return;
    }

    this.marketOverview$.pipe(take(1)).subscribe(tokenOverview => {
      tokenOverview.length
        ? this.loadMarketOverviewAll(sortByKey, ascending)
        : this.loadMarketOverviewSmartInit(sortByKey, ascending);
    });
  };

  loadOffersAndStartListener = (id: string) => {
    from(Market.MarketToken.create(id, Market.defaultNetworkSettings))
      .pipe(take(1))
      .subscribe(marketToken => {
        this.marketTokenRef = marketToken;

        this.marketToken$.next(this.marketTokenRef);
        this.startMarketTokenListener();
      });
  };

  unsubscribeMarketTokenListener = () => {
    this.marketTokenRef = null;
  };

  getTop10GainersAndLosers = () => {
    return this.loadMarketOverviewQuery().pipe(
      take(1),
      map(overview => {
        return {
          gainers: overview.tokens('priceIncrease', 0, 10, false).toArray(),
          losers: overview.tokens('priceIncrease', 0, 10, true).toArray(),
        };
      }),
    );
  };

  private loadMarketOverviewSearch = (search: string) => {
    this.loadMarketOverviewQuery()
      .pipe(
        take(1),
        map(overview => overview.searchTokens(search).toArray()),
      )
      .subscribe(overview => {
        this.marketOverview$.next(overview);
      });
  };

  private loadMarketOverviewAll = (
    sortByKey: Market.TokenSortByKey,
    ascending: boolean,
  ) => {
    this.loadMarketOverviewQuery()
      .pipe(
        take(1),
        map(overview =>
          overview.tokens(sortByKey, 0, 100, ascending).toArray(),
        ),
      )
      .subscribe(overview => {
        this.marketOverview$.next(overview);
      });
  };

  private loadMarketOverviewSmartInit = (
    sortByKey: Market.TokenSortByKey,
    ascending: boolean,
  ) => {
    this.loadMarketOverviewQuery()
      .pipe(
        take(1),
        map(overview => overview.tokens(sortByKey, 0, 20, ascending).toArray()),
      )
      .subscribe(overview => {
        this.marketOverview$.next(overview);
        this.loadMarketOverviewSmartRemaining(sortByKey, ascending, overview);
      });
  };

  private loadMarketOverviewSmartRemaining = (
    sortByKey: Market.TokenSortByKey,
    ascending: boolean,
    currentOverview: Market.TokenOverview[],
  ) => {
    this.loadMarketOverviewQuery()
      .pipe(
        take(1),
        map(overview =>
          overview.tokens(sortByKey, 20, 80, ascending).toArray(),
        ),
      )
      .subscribe(overview => {
        this.marketOverview$.next([...currentOverview, ...overview]);
      });
  };

  private loadMarketOverviewQuery = () => {
    return from(Market.MarketOverview.create());
  };

  private startMarketTokenListener = () => {
    this.marketTokenRef.addReceivedOfferListener(() => {
      this.marketToken$.next(this.marketTokenRef);
    });
  };
}
